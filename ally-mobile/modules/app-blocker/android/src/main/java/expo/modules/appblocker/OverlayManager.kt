package expo.modules.appblocker

import android.content.Context
import android.content.Intent
import android.graphics.PixelFormat
import android.net.Uri
import android.os.Build
import android.view.Gravity
import android.view.LayoutInflater
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView

object OverlayManager {

  private var overlayView: View? = null
  private var wm: WindowManager? = null

  fun show(ctx: Context, appLabel: String) {
    if (overlayView != null) {
      // Just update the label if already showing
      overlayView?.findViewById<TextView>(
        ctx.resources.getIdentifier("overlay_app", "id", ctx.packageName)
      )?.text = appLabel
      return
    }

    val type = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
    } else {
      @Suppress("DEPRECATION")
      WindowManager.LayoutParams.TYPE_SYSTEM_ALERT
    }

    val params = WindowManager.LayoutParams(
      WindowManager.LayoutParams.MATCH_PARENT,
      WindowManager.LayoutParams.MATCH_PARENT,
      type,
      WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
        WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED,
      PixelFormat.TRANSLUCENT
    ).apply { gravity = Gravity.TOP or Gravity.START }

    val pkg = ctx.packageName
    val layoutId = ctx.resources.getIdentifier("blocker_overlay", "layout", pkg)
    val view = LayoutInflater.from(ctx).inflate(layoutId, null)

    val appTv = view.findViewById<TextView>(
      ctx.resources.getIdentifier("overlay_app", "id", pkg)
    )
    appTv.text = appLabel

    val btn = view.findViewById<Button>(
      ctx.resources.getIdentifier("overlay_negotiate", "id", pkg)
    )
    btn.setOnClickListener {
      // Fire ally:// deep link so the JS layer picks it up via expo-linking
      val uri = Uri.parse("ally://negotiate?app=${Uri.encode(appLabel)}")
      val deepLink = Intent(Intent.ACTION_VIEW, uri).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK or
          Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP
        setPackage(pkg)
      }
      try {
        ctx.startActivity(deepLink)
      } catch (_: Exception) {
        // Fallback to plain launch
        val launch = ctx.packageManager.getLaunchIntentForPackage(pkg)?.apply {
          flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
          putExtra("ally_action", "negotiate")
          putExtra("ally_blocked_app", appLabel)
        }
        if (launch != null) ctx.startActivity(launch)
      }
    }

    val manager = ctx.getSystemService(Context.WINDOW_SERVICE) as WindowManager
    try {
      manager.addView(view, params)
      overlayView = view
      wm = manager
    } catch (e: Exception) {
      // Permission may have been revoked
      overlayView = null
      wm = null
    }
  }

  fun hide() {
    val v = overlayView
    val m = wm
    if (v != null && m != null) {
      try { m.removeView(v) } catch (_: Exception) {}
    }
    overlayView = null
    wm = null
  }

  fun isShowing(): Boolean = overlayView != null
}
