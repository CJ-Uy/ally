package expo.modules.appblocker

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

/**
 * Restarts BlockerService after the device boots if the user had blocking enabled.
 * The service itself reads its config from SharedPreferences.
 */
class BootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent?) {
    if (intent?.action != Intent.ACTION_BOOT_COMPLETED) return
    val i = Intent(context, BlockerService::class.java).apply {
      action = BlockerService.ACTION_BOOT_RESTART
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      context.startForegroundService(i)
    } else {
      context.startService(i)
    }
  }
}
