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
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

/**
 * Long-running foreground service.
 *
 * Responsibilities:
 *  1. Poll the Turso `session_sync` row every 30s for the active state.
 *  2. While a session is active, poll the foreground app every ~1.2s and draw
 *     an overlay over blocked packages.
 *  3. Survive being swiped away (`START_STICKY`) and respond to BOOT_COMPLETED
 *     by reading SharedPreferences and resuming where it left off.
 *
 * Configuration is persisted to SharedPreferences so the BootReceiver can
 * restart the service after a phone reboot without needing JS.
 */
class BlockerService : Service() {

  companion object {
    const val CHANNEL_ID = "ally_blocker"
    const val NOTIF_ID = 7331

    private const val APP_POLL_MS = 1200L
    private const val SESSION_POLL_MS = 30_000L

    const val ACTION_WATCH = "expo.modules.appblocker.WATCH"
    const val ACTION_UPDATE_PACKAGES = "expo.modules.appblocker.UPDATE_PACKAGES"
    const val ACTION_BREAK = "expo.modules.appblocker.BREAK"
    const val ACTION_STOP = "expo.modules.appblocker.STOP"
    const val ACTION_BOOT_RESTART = "expo.modules.appblocker.BOOT_RESTART"

    const val EXTRA_DB_URL = "db_url"
    const val EXTRA_AUTH_TOKEN = "auth_token"
    const val EXTRA_PACKAGES = "packages"
    const val EXTRA_BREAK_UNTIL = "break_until"

    private const val PREFS = "ally_blocker_prefs"
    private const val PREF_DB_URL = "db_url"
    private const val PREF_AUTH_TOKEN = "auth_token"
    private const val PREF_PACKAGES = "packages_csv"
    private const val PREF_ENABLED = "enabled"

    // Hooks invoked from the AppBlockerModule so JS can subscribe to events.
    var onDetected: ((pkg: String, label: String) -> Unit)? = null
    var onCleared: (() -> Unit)? = null

    @Volatile var sessionActive: Boolean = false
      private set
  }

  private var sessionJob: Job? = null
  private var appJob: Job? = null

  @Volatile private var dbUrl: String = ""
  @Volatile private var authToken: String = ""
  @Volatile private var blockedPackages: Set<String> = emptySet()
  @Volatile private var breakUntilMs: Long = 0L

  private var lastBlockedPkg: String? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_WATCH -> {
        dbUrl = intent.getStringExtra(EXTRA_DB_URL) ?: ""
        authToken = intent.getStringExtra(EXTRA_AUTH_TOKEN) ?: ""
        val pkgs = intent.getStringArrayListExtra(EXTRA_PACKAGES) ?: arrayListOf()
        blockedPackages = pkgs.toSet()
        persistConfig()
        startForegroundCompat()
        startWatching()
      }
      ACTION_UPDATE_PACKAGES -> {
        val pkgs = intent.getStringArrayListExtra(EXTRA_PACKAGES) ?: arrayListOf()
        blockedPackages = pkgs.toSet()
        getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
          .putString(PREF_PACKAGES, pkgs.joinToString(","))
          .apply()
      }
      ACTION_BREAK -> {
        breakUntilMs = intent.getLongExtra(EXTRA_BREAK_UNTIL, 0L)
        OverlayManager.hide()
        lastBlockedPkg = null
      }
      ACTION_BOOT_RESTART -> {
        if (!loadPersistedConfig()) {
          stopSelf()
          return START_NOT_STICKY
        }
        startForegroundCompat()
        startWatching()
      }
      ACTION_STOP -> {
        clearPersistedConfig()
        stopAll()
        return START_NOT_STICKY
      }
      else -> {
        // Started by the system after a kill — restore from prefs.
        if (!loadPersistedConfig()) {
          stopSelf()
          return START_NOT_STICKY
        }
        startForegroundCompat()
        startWatching()
      }
    }
    return START_STICKY
  }

  override fun onDestroy() {
    sessionJob?.cancel()
    appJob?.cancel()
    OverlayManager.hide()
    super.onDestroy()
  }

  // ── lifecycle ─────────────────────────────────────────────────────────

  private fun stopAll() {
    sessionJob?.cancel()
    appJob?.cancel()
    sessionJob = null
    appJob = null
    OverlayManager.hide()
    sessionActive = false
    lastBlockedPkg = null
    stopForeground(STOP_FOREGROUND_REMOVE)
    stopSelf()
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
      .setContentTitle("Ally is watching")
      .setContentText("Distractions will be blocked when a study session is active")
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
    nm.createNotificationChannel(
      NotificationChannel(CHANNEL_ID, "Ally App Blocker", NotificationManager.IMPORTANCE_LOW)
        .apply { description = "Keeps Ally watching for distracting apps during sessions" }
    )
  }

  // ── prefs persistence ─────────────────────────────────────────────────

  private fun persistConfig() {
    getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
      .putString(PREF_DB_URL, dbUrl)
      .putString(PREF_AUTH_TOKEN, authToken)
      .putString(PREF_PACKAGES, blockedPackages.joinToString(","))
      .putBoolean(PREF_ENABLED, true)
      .apply()
  }

  private fun loadPersistedConfig(): Boolean {
    val sp = getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    if (!sp.getBoolean(PREF_ENABLED, false)) return false
    dbUrl = sp.getString(PREF_DB_URL, "") ?: ""
    authToken = sp.getString(PREF_AUTH_TOKEN, "") ?: ""
    blockedPackages = (sp.getString(PREF_PACKAGES, "") ?: "")
      .split(",").map { it.trim() }.filter { it.isNotEmpty() }.toSet()
    return dbUrl.isNotEmpty() && authToken.isNotEmpty()
  }

  private fun clearPersistedConfig() {
    getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().clear().apply()
  }

  // ── coroutines ────────────────────────────────────────────────────────

  private fun startWatching() {
    sessionJob?.cancel()
    appJob?.cancel()

    sessionJob = CoroutineScope(Dispatchers.IO).launch {
      while (isActive) {
        try {
          val active = queryTursoSessionActive()
          if (active != sessionActive) {
            sessionActive = active
            if (active) startAppPolling() else stopAppPolling()
          }
        } catch (_: Exception) {
          // Network error — keep retrying on next tick
        }
        delay(SESSION_POLL_MS)
      }
    }
  }

  private fun startAppPolling() {
    appJob?.cancel()
    appJob = CoroutineScope(Dispatchers.IO).launch {
      while (isActive) {
        try { tick() } catch (_: Exception) {}
        delay(APP_POLL_MS)
      }
    }
  }

  private fun stopAppPolling() {
    appJob?.cancel()
    appJob = null
    OverlayManager.hide()
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
    } else if (lastBlockedPkg != null) {
      OverlayManager.hide()
      lastBlockedPkg = null
      onCleared?.invoke()
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

  // ── Turso ─────────────────────────────────────────────────────────────

  /**
   * Fires a v2/pipeline POST against the user's Turso DB to read
   * `session_sync.active`. Returns false on any error so we fail safe (don't
   * block) rather than block forever if the network is flaky.
   */
  private fun queryTursoSessionActive(): Boolean {
    if (dbUrl.isEmpty() || authToken.isEmpty()) return false
    val httpUrl = toHttpUrl(dbUrl) + "/v2/pipeline"
    val body = """
      {
        "requests": [
          {"type":"execute","stmt":{"sql":"SELECT active FROM session_sync WHERE id = 1"}},
          {"type":"close"}
        ]
      }
    """.trimIndent()

    val conn = URL(httpUrl).openConnection() as HttpURLConnection
    return try {
      conn.requestMethod = "POST"
      conn.connectTimeout = 8000
      conn.readTimeout = 8000
      conn.setRequestProperty("Authorization", "Bearer $authToken")
      conn.setRequestProperty("Content-Type", "application/json")
      conn.doOutput = true
      conn.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }

      if (conn.responseCode !in 200..299) return false
      val text = conn.inputStream.bufferedReader().use { it.readText() }
      parseSessionActive(text)
    } catch (_: Exception) {
      false
    } finally {
      conn.disconnect()
    }
  }

  private fun parseSessionActive(json: String): Boolean {
    return try {
      val root = JSONObject(json)
      val results = root.optJSONArray("results") ?: return false
      val first = results.optJSONObject(0) ?: return false
      val response = first.optJSONObject("response") ?: return false
      val result = response.optJSONObject("result") ?: return false
      val rows = result.optJSONArray("rows") ?: return false
      if (rows.length() == 0) return false
      val row = rows.optJSONArray(0) ?: return false
      val cell = row.optJSONObject(0) ?: return false
      val value = cell.optString("value", "0")
      value == "1" || value == "true"
    } catch (_: Exception) {
      false
    }
  }

  private fun toHttpUrl(libsqlUrl: String): String {
    return libsqlUrl.replace("libsql://", "https://").removeSuffix("/")
  }
}
