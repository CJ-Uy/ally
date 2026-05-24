package expo.modules.appblocker

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch

class BlockerService : Service() {

  companion object {
    const val CHANNEL_ID = "ally_blocker"
    const val NOTIF_ID = 7331
    const val POLL_MS = 1200L

    const val ACTION_START = "expo.modules.appblocker.START"
    const val ACTION_STOP = "expo.modules.appblocker.STOP"
    const val ACTION_UPDATE = "expo.modules.appblocker.UPDATE"
    const val ACTION_BREAK = "expo.modules.appblocker.BREAK"

    const val EXTRA_PACKAGES = "packages"
    const val EXTRA_BREAK_UNTIL = "break_until"

    // Volatile shared state — read by the running coroutine, written by intents
    @Volatile var blockedPackages: Set<String> = emptySet()
    @Volatile var breakUntilMs: Long = 0L

    // Callback hook for the Expo module to forward events to JS.
    // The module sets this when JS subscribes; service invokes it when it detects/clears.
    var onDetected: ((pkg: String, label: String) -> Unit)? = null
    var onCleared: (() -> Unit)? = null
  }

  private var pollJob: Job? = null
  private var lastBlockedPkg: String? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_START -> {
        intent.getStringArrayListExtra(EXTRA_PACKAGES)?.let {
          blockedPackages = it.toSet()
        }
        startForegroundCompat()
        startPolling()
      }
      ACTION_UPDATE -> {
        intent.getStringArrayListExtra(EXTRA_PACKAGES)?.let {
          blockedPackages = it.toSet()
        }
      }
      ACTION_BREAK -> {
        val until = intent.getLongExtra(EXTRA_BREAK_UNTIL, 0L)
        breakUntilMs = until
        OverlayManager.hide()
        lastBlockedPkg = null
      }
      ACTION_STOP -> {
        stopPolling()
        OverlayManager.hide()
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
      }
    }
    return START_STICKY
  }

  override fun onDestroy() {
    stopPolling()
    OverlayManager.hide()
    super.onDestroy()
  }

  private fun startForegroundCompat() {
    ensureChannel()
    val pi = PendingIntent.getActivity(
      this, 0,
      packageManager.getLaunchIntentForPackage(packageName),
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
    val notif = Notification.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
      .setContentTitle("Ally is keeping you focused")
      .setContentText("Distracting apps will be blocked during your session")
      .setContentIntent(pi)
      .setOngoing(true)
      .setCategory(Notification.CATEGORY_SERVICE)
      .build()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
      startForeground(NOTIF_ID, notif, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
    } else {
      startForeground(NOTIF_ID, notif)
    }
  }

  private fun ensureChannel() {
    val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (nm.getNotificationChannel(CHANNEL_ID) != null) return
    val ch = NotificationChannel(
      CHANNEL_ID,
      "Ally App Blocker",
      NotificationManager.IMPORTANCE_LOW
    ).apply { description = "Keeps Ally watching for distracting apps during sessions" }
    nm.createNotificationChannel(ch)
  }

  private fun startPolling() {
    pollJob?.cancel()
    pollJob = CoroutineScope(Dispatchers.IO).launch {
      while (isActive) {
        try { tick() } catch (_: Exception) {}
        delay(POLL_MS)
      }
    }
  }

  private fun stopPolling() {
    pollJob?.cancel()
    pollJob = null
    lastBlockedPkg = null
  }

  private fun tick() {
    if (System.currentTimeMillis() < breakUntilMs) {
      if (OverlayManager.isShowing()) {
        OverlayManager.hide()
        lastBlockedPkg = null
      }
      return
    }

    val current = getForegroundPackage() ?: return
    // Don't block ourselves
    if (current == packageName) {
      if (lastBlockedPkg != null) {
        OverlayManager.hide()
        lastBlockedPkg = null
        onCleared?.invoke()
      }
      return
    }

    if (blockedPackages.contains(current)) {
      if (lastBlockedPkg != current) {
        lastBlockedPkg = current
        val label = labelFor(current)
        OverlayManager.show(this, label)
        onDetected?.invoke(current, label)
      }
    } else {
      if (lastBlockedPkg != null) {
        OverlayManager.hide()
        lastBlockedPkg = null
        onCleared?.invoke()
      }
    }
  }

  private fun getForegroundPackage(): String? {
    val usm = getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
    val now = System.currentTimeMillis()
    val events = usm.queryEvents(now - 3000, now)
    val event = UsageEvents.Event()
    var lastFg: String? = null
    while (events.hasNextEvent()) {
      events.getNextEvent(event)
      if (event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND) {
        lastFg = event.packageName
      }
    }
    if (lastFg != null) return lastFg
    val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, now - 3000, now)
    return stats?.maxByOrNull { it.lastTimeUsed }?.packageName
  }

  private fun labelFor(pkg: String): String = try {
    packageManager.getApplicationLabel(packageManager.getApplicationInfo(pkg, 0)).toString()
  } catch (_: Exception) { pkg }
}
