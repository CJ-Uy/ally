import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { clearPairing, loadPairing, type PairingData } from "../lib/storage";
import {
  fetchSessionSync,
  fetchUpcomingStudyBlocks,
  type SessionSync,
  type StudyBlock,
} from "../lib/turso";
import { scheduleStudyBlockNotifications } from "../lib/notifications";
import {
  hasUsagePermission,
  hasOverlayPermission,
  openUsagePermissionSettings,
  openOverlayPermissionSettings,
  startBlocking,
  stopBlocking,
  updateBlockedPackages,
} from "../../modules/app-blocker";
import { loadBlockedList } from "../lib/blocked-list";
import allyImage from "../../assets/ally.png";

interface Props {
  onUnpaired: () => void;
  onOpenPicker?: () => void;
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ms: number): string {
  const date = new Date(ms);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

function minutesUntil(ms: number): number {
  return Math.round((ms - Date.now()) / 60_000);
}

function elapsedLabel(startedAt: number): string {
  const mins = Math.floor((Date.now() - startedAt) / 60_000);
  if (mins < 1) return "just started";
  if (mins < 60) return `${mins}m elapsed`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m elapsed`;
}

export default function HomeScreen({ onUnpaired, onOpenPicker }: Props) {
  const [pairing, setPairing] = useState<PairingData | null>(null);
  const [session, setSession] = useState<SessionSync | null>(null);
  const [blocks, setBlocks] = useState<StudyBlock[]>([]);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageGranted, setUsageGranted] = useState(false);
  const [overlayGranted, setOverlayGranted] = useState(false);
  const [blockedList, setBlockedList] = useState<string[]>([]);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const blockingRef = useRef(false);

  const checkPerms = useCallback(() => {
    try {
      setUsageGranted(hasUsagePermission());
      setOverlayGranted(hasOverlayPermission());
    } catch {
      setUsageGranted(false);
      setOverlayGranted(false);
    }
  }, []);

  // Re-check perms whenever app returns to foreground (after Settings visit)
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        checkPerms();
        void loadBlockedList().then(setBlockedList);
      }
    });
    checkPerms();
    void loadBlockedList().then(setBlockedList);
    return () => sub.remove();
  }, [checkPerms]);

  // Start/stop the blocker service based on session + permissions
  const allPermsGranted = usageGranted && overlayGranted;
  useEffect(() => {
    const shouldBlock = session?.active === true && allPermsGranted && blockedList.length > 0;
    if (shouldBlock && !blockingRef.current) {
      startBlocking(blockedList);
      blockingRef.current = true;
    } else if (!shouldBlock && blockingRef.current) {
      stopBlocking();
      blockingRef.current = false;
    } else if (shouldBlock && blockingRef.current) {
      // Already blocking — just push the latest list
      updateBlockedPackages(blockedList);
    }
  }, [session?.active, allPermsGranted, blockedList]);

  useEffect(() => {
    return () => {
      if (blockingRef.current) {
        stopBlocking();
        blockingRef.current = false;
      }
    };
  }, []);

  const refresh = useCallback(async (p: PairingData, quiet = false) => {
    if (!quiet) setLoading(true);
    setError(null);
    try {
      const [s, b] = await Promise.all([
        fetchSessionSync(p),
        fetchUpcomingStudyBlocks(p),
      ]);
      setSession(s);
      setBlocks(b);
      setLastSynced(new Date());
      await scheduleStudyBlockNotifications(b);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPairing().then((p) => {
      if (!p) { onUnpaired(); return; }
      setPairing(p);
      void refresh(p);
    });
  }, [onUnpaired, refresh]);

  useEffect(() => {
    if (!pairing) return;
    pollRef.current = setInterval(() => void refresh(pairing, true), 30_000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [pairing, refresh]);

  const sessionActive = session?.active ?? false;
  const blockerStatusLabel = !allPermsGranted ? "Setup needed"
    : sessionActive ? "Blocking"
    : "Ready";
  const blockerActive = allPermsGranted && sessionActive;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => pairing && void refresh(pairing)}
          tintColor="#4a6fa5"
          colors={["#4a6fa5"]}
        />
      }
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Image source={allyImage} style={styles.headerImage} resizeMode="contain" />
          <View>
            <Text style={styles.eyebrow}>Study Companion</Text>
            <Text style={styles.title}>Ally</Text>
          </View>
        </View>
        <View style={[styles.statusPill, sessionActive ? styles.statusPillActive : styles.statusPillIdle]}>
          <View style={[styles.statusDot, sessionActive ? styles.dotActive : styles.dotIdle]} />
          <Text style={[styles.statusText, sessionActive ? styles.statusTextActive : styles.statusTextIdle]}>
            {sessionActive ? "Active" : "Idle"}
          </Text>
        </View>
      </View>

      {/* Session card */}
      <View style={[styles.card, sessionActive && styles.cardActive]}>
        <Text style={styles.cardLabel}>Desktop Session</Text>
        {session == null ? (
          <View style={styles.emptyRow}>
            <Image source={allyImage} style={styles.emptyImage} resizeMode="contain" />
            <Text style={styles.muted}>Waiting for first sync…{"\n"}Pull down to refresh.</Text>
          </View>
        ) : sessionActive ? (
          <View style={styles.sessionInfo}>
            <Text style={styles.sessionSubject}>
              {session.subject ?? "General study"}
            </Text>
            <View style={styles.sessionMeta}>
              {session.startedAt && (
                <Text style={styles.sessionMetaText}>
                  Started {formatTime(session.startedAt)} · {elapsedLabel(session.startedAt)}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.idleRow}>
            <Image source={allyImage} style={styles.idleImage} resizeMode="contain" />
            <Text style={styles.idleText}>No session running on desktop</Text>
          </View>
        )}
      </View>

      {/* App blocker card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardLabel}>App Blocker</Text>
          <View style={[styles.blockerBadge, blockerActive ? styles.blockerBadgeOn : styles.blockerBadgeOff]}>
            <View style={[styles.blockerDot, blockerActive ? styles.blockerDotOn : styles.blockerDotOff]} />
            <Text style={[styles.blockerBadgeText, blockerActive ? styles.blockerBadgeTextOn : styles.blockerBadgeTextOff]}>
              {blockerStatusLabel}
            </Text>
          </View>
        </View>

        {!usageGranted && (
          <View style={styles.permRow}>
            <Text style={styles.permTitle}>Step 1 of 2 — Usage access</Text>
            <Text style={styles.permDesc}>
              Lets Ally see which app is in the foreground so it knows when to block.
            </Text>
            <TouchableOpacity style={styles.permBtn} onPress={openUsagePermissionSettings} activeOpacity={0.8}>
              <Text style={styles.permBtnText}>Grant Usage Access</Text>
            </TouchableOpacity>
          </View>
        )}

        {usageGranted && !overlayGranted && (
          <View style={styles.permRow}>
            <Text style={styles.permTitle}>Step 2 of 2 — Draw over other apps</Text>
            <Text style={styles.permDesc}>
              Lets Ally show the block screen on top of distracting apps.
            </Text>
            <TouchableOpacity style={styles.permBtn} onPress={openOverlayPermissionSettings} activeOpacity={0.8}>
              <Text style={styles.permBtnText}>Grant Overlay Permission</Text>
            </TouchableOpacity>
          </View>
        )}

        {allPermsGranted && (
          <>
            {sessionActive ? (
              <Text style={styles.blockerActiveText}>
                Blocking {blockedList.length} apps while you study.
              </Text>
            ) : (
              <Text style={styles.muted}>
                Ready. Blocking will activate when your desktop session starts.
              </Text>
            )}
            <TouchableOpacity style={styles.manageBtn} onPress={onOpenPicker} activeOpacity={0.8}>
              <Text style={styles.manageBtnText}>Manage blocked apps ({blockedList.length})</Text>
              <Text style={styles.manageBtnArrow}>›</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Upcoming study blocks */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardLabel}>Upcoming Study Blocks</Text>
          <TouchableOpacity
            onPress={() => pairing && void refresh(pairing)}
            disabled={loading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            {loading
              ? <ActivityIndicator size="small" color="#4a6fa5" />
              : <Text style={styles.refreshBtn}>Refresh</Text>
            }
          </TouchableOpacity>
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : blocks.length === 0 ? (
          <Text style={styles.muted}>No study blocks in the next 25 hours.</Text>
        ) : (
          <View style={styles.blockList}>
            {blocks.map((block, i) => {
              const mins = minutesUntil(block.startsAt);
              const soon = mins <= 35 && mins > 0;
              const now = mins <= 0;
              return (
                <View
                  key={block.id}
                  style={[styles.blockRow, i > 0 && styles.blockRowBorder, soon && styles.blockRowSoon]}
                >
                  <View style={styles.blockTimeCol}>
                    <Text style={styles.blockDate}>{formatDate(block.startsAt)}</Text>
                    <Text style={styles.blockTime}>{formatTime(block.startsAt)}</Text>
                  </View>
                  <View style={styles.blockInfo}>
                    <Text style={styles.blockTitle} numberOfLines={2}>{block.title}</Text>
                    <Text style={[styles.blockCountdown, (soon || now) && styles.blockCountdownSoon]}>
                      {now ? "Now" : mins < 60
                        ? `in ${mins} min`
                        : `in ${Math.floor(mins / 60)}h ${mins % 60}m`}
                    </Text>
                  </View>
                  {soon && (
                    <View style={styles.soonBadge}>
                      <Text style={styles.soonBadgeText}>Soon</Text>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      <View style={styles.footer}>
        {lastSynced && (
          <Text style={styles.footerText}>
            Synced {lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}
        <TouchableOpacity onPress={() => void clearPairing().then(onUnpaired)}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eef2f7" },
  container: { padding: 24, paddingTop: 56, gap: 16, paddingBottom: 48 },

  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerImage: { width: 44, height: 44 },
  eyebrow: { fontSize: 11, fontWeight: "600", color: "#6b7a93", textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 26, fontWeight: "700", color: "#1e2a3d", letterSpacing: -0.5, marginTop: 1 },

  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1,
  },
  statusPillIdle: { backgroundColor: "#f9fbfd", borderColor: "#dde5ee" },
  statusPillActive: { backgroundColor: "#dcfce7", borderColor: "#86efac" },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  dotIdle: { backgroundColor: "#caddec" },
  dotActive: { backgroundColor: "#16a34a" },
  statusText: { fontSize: 12, fontWeight: "600" },
  statusTextIdle: { color: "#6b7a93" },
  statusTextActive: { color: "#15803d" },

  card: {
    backgroundColor: "#f9fbfd", borderRadius: 16, borderWidth: 1,
    borderColor: "#dde5ee", padding: 20, gap: 12,
  },
  cardActive: { borderColor: "#93c5fd", backgroundColor: "#f0f5fc" },
  cardHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLabel: { fontSize: 11, fontWeight: "700", color: "#6b7a93", textTransform: "uppercase", letterSpacing: 1 },
  refreshBtn: { fontSize: 13, color: "#4a6fa5", fontWeight: "600" },

  emptyRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  emptyImage: { width: 36, height: 36, opacity: 0.5 },

  sessionInfo: { gap: 4 },
  sessionSubject: { fontSize: 20, fontWeight: "700", color: "#1e2a3d", letterSpacing: -0.3 },
  sessionMeta: { flexDirection: "row", gap: 8 },
  sessionMetaText: { fontSize: 13, color: "#4a6fa5", fontWeight: "500" },

  idleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  idleImage: { width: 36, height: 36, opacity: 0.4 },
  idleText: { fontSize: 14, color: "#6b7a93", flex: 1 },

  muted: { fontSize: 13, color: "#6b7a93", lineHeight: 20 },
  errorText: { fontSize: 13, color: "#dc2626", lineHeight: 19 },

  // App blocker
  blockerBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
  },
  blockerBadgeOn: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  blockerBadgeOff: { backgroundColor: "#f9fbfd", borderColor: "#dde5ee" },
  blockerDot: { width: 6, height: 6, borderRadius: 3 },
  blockerDotOn: { backgroundColor: "#f97316" },
  blockerDotOff: { backgroundColor: "#cbd5e1" },
  blockerBadgeText: { fontSize: 11, fontWeight: "700" },
  blockerBadgeTextOn: { color: "#c2410c" },
  blockerBadgeTextOff: { color: "#6b7a93" },
  blockerActiveText: { fontSize: 13, color: "#c2410c", fontWeight: "500", lineHeight: 19 },

  permRow: { gap: 8 },
  permTitle: { fontSize: 13, fontWeight: "700", color: "#1e2a3d" },
  permDesc: { fontSize: 13, color: "#6b7a93", lineHeight: 20 },
  permBtn: {
    backgroundColor: "#4a6fa5", borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16, alignItems: "center", marginTop: 4,
  },
  permBtnText: { fontSize: 13, color: "#ffffff", fontWeight: "600" },

  manageBtn: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#ffffff", borderRadius: 10, borderWidth: 1, borderColor: "#dde5ee",
    paddingVertical: 12, paddingHorizontal: 14,
  },
  manageBtnText: { fontSize: 14, color: "#1e2a3d", fontWeight: "600" },
  manageBtnArrow: { fontSize: 22, color: "#8fa3c0", lineHeight: 22 },

  blockList: { gap: 0 },
  blockRow: { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 12 },
  blockRowBorder: { borderTopWidth: 1, borderTopColor: "#eef2f7" },
  blockRowSoon: { backgroundColor: "#fffbeb", borderRadius: 10, paddingHorizontal: 10, marginHorizontal: -10 },
  blockTimeCol: { gap: 2, minWidth: 58 },
  blockDate: { fontSize: 11, color: "#6b7a93", fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.3 },
  blockTime: { fontSize: 16, fontWeight: "700", color: "#1e2a3d" },
  blockInfo: { flex: 1, gap: 3 },
  blockTitle: { fontSize: 14, fontWeight: "600", color: "#1e2a3d", lineHeight: 19 },
  blockCountdown: { fontSize: 12, color: "#6b7a93" },
  blockCountdownSoon: { color: "#d97706", fontWeight: "600" },
  soonBadge: {
    backgroundColor: "#fef3c7", borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: "#fcd34d",
  },
  soonBadgeText: { fontSize: 11, fontWeight: "700", color: "#92400e" },

  footer: { alignItems: "center", gap: 10, marginTop: 4 },
  footerText: { fontSize: 12, color: "#6b7a93" },
  disconnectText: { fontSize: 13, color: "#dc2626" },
});
