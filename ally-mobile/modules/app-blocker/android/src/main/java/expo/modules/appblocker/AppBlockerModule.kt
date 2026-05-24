package expo.modules.appblocker

import android.app.AppOpsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class AppBlockerModule : Module() {

  override fun definition() = ModuleDefinition {
    Name("AppBlocker")

    Events("onBlockedAppDetected", "onBlockedAppCleared")

    OnCreate {
      BlockerService.onDetected = { pkg, label ->
        sendEvent(
          "onBlockedAppDetected",
          mapOf("packageName" to pkg, "appLabel" to label)
        )
      }
      BlockerService.onCleared = {
        sendEvent("onBlockedAppCleared", mapOf<String, Any>())
      }
    }

    OnDestroy {
      BlockerService.onDetected = null
      BlockerService.onCleared = null
    }

    Function("hasUsagePermission") { hasUsagePermission() }

    Function("openUsagePermissionSettings") {
      val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
        flags = Intent.FLAG_ACTIVITY_NEW_TASK
      }
      appContext.reactContext?.startActivity(intent)
    }

    Function("hasOverlayPermission") { hasOverlayPermission() }

    Function("openOverlayPermissionSettings") {
      val ctx = appContext.reactContext ?: return@Function
      val intent = Intent(
        Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
        Uri.parse("package:${ctx.packageName}")
      ).apply { flags = Intent.FLAG_ACTIVITY_NEW_TASK }
      ctx.startActivity(intent)
    }

    Function("startBlocking") { packages: List<String> ->
      val ctx = appContext.reactContext ?: return@Function
      val i = Intent(ctx, BlockerService::class.java).apply {
        action = BlockerService.ACTION_START
        putStringArrayListExtra(BlockerService.EXTRA_PACKAGES, ArrayList(packages))
      }
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ctx.startForegroundService(i)
      } else {
        ctx.startService(i)
      }
    }

    Function("updateBlockedPackages") { packages: List<String> ->
      val ctx = appContext.reactContext ?: return@Function
      val i = Intent(ctx, BlockerService::class.java).apply {
        action = BlockerService.ACTION_UPDATE
        putStringArrayListExtra(BlockerService.EXTRA_PACKAGES, ArrayList(packages))
      }
      ctx.startService(i)
    }

    Function("grantBreak") { minutes: Int ->
      val ctx = appContext.reactContext ?: return@Function
      val until = System.currentTimeMillis() + (minutes * 60_000L)
      val i = Intent(ctx, BlockerService::class.java).apply {
        action = BlockerService.ACTION_BREAK
        putExtra(BlockerService.EXTRA_BREAK_UNTIL, until)
      }
      ctx.startService(i)
    }

    Function("stopBlocking") {
      val ctx = appContext.reactContext ?: return@Function
      val i = Intent(ctx, BlockerService::class.java).apply {
        action = BlockerService.ACTION_STOP
      }
      ctx.startService(i)
    }

    Function("getInstalledApps") { listInstalledApps() }
  }

  private fun hasUsagePermission(): Boolean {
    val ctx = appContext.reactContext ?: return false
    val ops = ctx.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
    val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      ops.unsafeCheckOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(),
        ctx.packageName
      )
    } else {
      @Suppress("DEPRECATION")
      ops.checkOpNoThrow(
        AppOpsManager.OPSTR_GET_USAGE_STATS,
        android.os.Process.myUid(),
        ctx.packageName
      )
    }
    return mode == AppOpsManager.MODE_ALLOWED
  }

  private fun hasOverlayPermission(): Boolean {
    val ctx = appContext.reactContext ?: return false
    return Settings.canDrawOverlays(ctx)
  }

  private fun listInstalledApps(): List<Map<String, Any>> {
    val ctx = appContext.reactContext ?: return emptyList()
    val pm = ctx.packageManager
    val flags = PackageManager.GET_META_DATA
    val apps = pm.getInstalledApplications(flags)
    return apps.mapNotNull { info ->
      // Only return launchable apps (excludes system services with no UI)
      val launch = pm.getLaunchIntentForPackage(info.packageName) ?: return@mapNotNull null
      val isSystem = (info.flags and ApplicationInfo.FLAG_SYSTEM) != 0
      val label = try { pm.getApplicationLabel(info).toString() } catch (_: Exception) { info.packageName }
      mapOf(
        "packageName" to info.packageName,
        "label" to label,
        "isSystem" to isSystem
      )
    }.sortedBy { (it["label"] as String).lowercase() }
  }
}
