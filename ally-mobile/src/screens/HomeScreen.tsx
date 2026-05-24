import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { clearPairing, loadPairing, type PairingData } from "../lib/storage";
import {
  fetchSessionSync,
  fetchUpcomingStudyBlocks,
  startMobileSession,
  stopMobileSession,
  type SessionSync,
  type StudyBlock,
} from "../lib/turso";
import { scheduleStudyBlockNotifications } from "../lib/notifications";
import {
  hasUsagePermission,
  hasOverlayPermission,
  startWatching,
  stopBlocking,
  updateBlockedPackages,
} from "../../modules/app-blocker";
import { loadBlockedList } from "../lib/blocked-list";
import allyImage from "../../assets/ally.png";

interface Props {
  onUnpaired: () => void;
  onOpenPicker?: () => void;
  onNeedsOnboarding?: () => void;
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

export default function HomeScreen({ onUnpaired, onOpenPicker, onNeedsOnboarding }: Props) {
  const [pairing, setPairing] = useState<PairingData | null>(null);
  const [session, setSession] = useState<SessionSync | null>(null);
  const [blocks, setBlocks] = useState<StudyBlock[]>([]);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permsOK, setPermsOK] = useState(false);
  const [blockedList, setBlockedList] = useState<string[]>([]);
  const [sessionBusy, setSessionBusy] = useState(false);
  const [showSubjectPrompt, setShowSubjectPrompt] = useState(false);
  const [subjectInput, setSubjectInput] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchingRef = useRef(false);

  const checkPerms = useCallback(() => {
    try {
      const ok = hasUsagePermission() && hasOverlayPermission();
      setPermsOK(ok);
      return ok;
    } catch {
      setPermsOK(false);
      return false;
    }
  }, []);

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

  // Start the watching service ONCE we have pairing + perms + a blocked list.
  // The service is then self-sufficient — it polls Turso, blocks distractions
  // when a session is active, and survives the app being closed.
  useEffect(() => {
    if (!pairing || !permsOK || blockedList.length === 0) return;
    if (!watchingRef.current) {
      startWatching(pairing.dbUrl, pairing.authToken, blockedList);
      watchingRef.current = true;
    } else {
      // Already watching — just push the latest blocked list.
      updateBlockedPackages(blockedList);
    }
  }, [pairing, permsOK, blockedList]);

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
  const blockerStatusLabel = !permsOK ? "Setup needed" : sessionActive ? "Blocking" : "Watching";
  const blockerActive = permsOK && sessionActive;

  const handleStartSession = async () => {
    if (!pairing) return;
    setSessionBusy(true);
    try {
      await startMobileSession(pairing, subjectInput.trim() || null);
      setShowSubjectPrompt(false);
      setSubjectInput("");
      await refresh(pairing, true);
    } catch (err) {
      Alert.alert("Couldn't start session", err instanceof Error ? err.message : String(err));
    } finally {
      setSessionBusy(false);
    }
  };

  const handleStopSession = async () => {
    if (!pairing) return;
    setSessionBusy(true);
    try {
      await stopMobileSession(pairing);
      await refresh(pairing, true);
    } catch (err) {
      Alert.alert("Couldn't stop session", err instanceof Error ? err.message : String(err));
    } finally {
      setSessionBusy(false);
    }
  };

  const handleDisconnect = async () => {
    if (watchingRef.current) {
      stopBlocking();
      watchingRef.current = false;
    }
    await clearPairing();
    onUnpaired();
  };

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
        <Text style={styles.cardLabel}>Study Session</Text>
        {session == null ? (
          <View style={styles.emptyRow}>
            <Image source={allyImage} style={styles.emptyImage} resizeMode="contain" />
            <Text style={styles.muted}>Waiting for first sync…{"\n"}Pull down to refresh.</Text>
          </View>
        ) : sessionActive ? (
          <>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionSubject}>
                {session.subject ?? "General study"}
              </Text>
              {session.startedAt && (
                <Text style={styles.sessionMetaText}>
                  Started {formatTime(session.startedAt)} · {elapsedLabel(session.startedAt)}
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.stopBtn}
              onPress={() => void handleStopSession()}
              disabled={sessionBusy}
              activeOpacity={0.85}
            >
              {sessionBusy
                ? <ActivityIndicator color="#dc2626" size="small" />
                : <Text style={styles.stopBtnText}>End session</Text>
              }
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={styles.idleRow}>
              <Image source={allyImage} style={styles.idleImage} resizeMode="contain" />
              <Text style={styles.idleText}>No session running. Start one from here or your desktop.</Text>
            </View>
            <TouchableOpacity
              style={styles.startBtn}
              onPress={() => setShowSubjectPrompt(true)}
              disabled={sessionBusy}
              activeOpacity={0.85}
            >
              <Text style={styles.startBtnText}>Start study session</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* App blocker card */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardLabel}>App Blocker</Text>
          <View style={[styles.blockerBadge, blockerActive ? styles.blockerBadgeOn : permsOK ? styles.blockerBadgeReady : styles.blockerBadgeOff]}>
            <View style={[
              styles.blockerDot,
              blockerActive ? styles.blockerDotOn : permsOK ? styles.blockerDotReady : styles.blockerDotOff,
            ]} />
            <Text style={[
              styles.blockerBadgeText,
              blockerActive ? styles.blockerBadgeTextOn : permsOK ? styles.blockerBadgeTextReady : styles.blockerBadgeTextOff,
            ]}>
              {blockerStatusLabel}
            </Text>
          </View>
        </View>

        {!permsOK ? (
          <>
            <Text style={styles.muted}>
              The blocker needs Usage Access and Overlay permission to work.
            </Text>
            <TouchableOpacity style={styles.permBtn} onPress={onNeedsOnboarding} activeOpacity={0.85}>
              <Text style={styles.permBtnText}>Finish setup</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {sessionActive ? (
              <Text style={styles.blockerActiveText}>
                Blocking {blockedList.length} apps while you study.
              </Text>
            ) : (
              <Text style={styles.muted}>
                Ready. Blocking will activate when a study session starts — even if Ally is closed.
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
                <View key={block.id} style={[styles.blockRow, i > 0 && styles.blockRowBorder, soon && styles.blockRowSoon]}>
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
                  {soon && <View style={styles.soonBadge}><Text style={styles.soonBadgeText}>Soon</Text></View>}
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
        <TouchableOpacity onPress={() => void handleDisconnect()}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
      </View>

      {/* Start session modal */}
      <Modal
        visible={showSubjectPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSubjectPrompt(false)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Start a study session</Text>
            <Text style={styles.modalHint}>What are you studying? (Optional)</Text>
            <TextInput
              style={styles.modalInput}
              value={subjectInput}
              onChangeText={setSubjectInput}
              placeholder="e.g. Calculus, History..."
              placeholderTextColor="#8fa3c0"
              autoFocus
              maxLength={80}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowSubjectPrompt(false)}
                disabled={sessionBusy}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() => void handleStartSession()}
                disabled={sessionBusy}
              >
                {sessionBusy
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Text style={styles.modalConfirmText}>Start</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  sessionMetaText: { fontSize: 13, color: "#4a6fa5", fontWeight: "500" },

  idleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  idleImage: { width: 36, height: 36, opacity: 0.4 },
  idleText: { fontSize: 14, color: "#6b7a93", flex: 1, lineHeight: 20 },

  startBtn: {
    backgroundColor: "#4a6fa5",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    shadowColor: "#4a6fa5",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  startBtnText: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },

  stopBtn: {
    borderWidth: 1, borderColor: "#fecaca", backgroundColor: "#fef2f2",
    borderRadius: 10, paddingVertical: 11, alignItems: "center",
  },
  stopBtnText: { color: "#b91c1c", fontSize: 14, fontWeight: "600" },

  muted: { fontSize: 13, color: "#6b7a93", lineHeight: 20 },
  errorText: { fontSize: 13, color: "#dc2626", lineHeight: 19 },

  blockerBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1,
  },
  blockerBadgeOn: { backgroundColor: "#fff7ed", borderColor: "#fed7aa" },
  blockerBadgeReady: { backgroundColor: "#dcfce7", borderColor: "#86efac" },
  blockerBadgeOff: { backgroundColor: "#f9fbfd", borderColor: "#dde5ee" },
  blockerDot: { width: 6, height: 6, borderRadius: 3 },
  blockerDotOn: { backgroundColor: "#f97316" },
  blockerDotReady: { backgroundColor: "#16a34a" },
  blockerDotOff: { backgroundColor: "#cbd5e1" },
  blockerBadgeText: { fontSize: 11, fontWeight: "700" },
  blockerBadgeTextOn: { color: "#c2410c" },
  blockerBadgeTextReady: { color: "#15803d" },
  blockerBadgeTextOff: { color: "#6b7a93" },
  blockerActiveText: { fontSize: 13, color: "#c2410c", fontWeight: "500", lineHeight: 19 },

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

  modalRoot: {
    flex: 1, backgroundColor: "rgba(30, 42, 61, 0.6)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  modalCard: {
    width: "100%", maxWidth: 420, backgroundColor: "#ffffff",
    borderRadius: 16, padding: 24, gap: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#1e2a3d" },
  modalHint: { fontSize: 13, color: "#6b7a93", lineHeight: 19 },
  modalInput: {
    borderWidth: 1.5, borderColor: "#dde5ee", borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#1e2a3d",
    backgroundColor: "#f9fbfd",
  },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  modalCancelBtn: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: "#6b7a93", fontSize: 14, fontWeight: "600" },
  modalConfirmBtn: {
    backgroundColor: "#4a6fa5", borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 22, minWidth: 80, alignItems: "center",
  },
  modalConfirmText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
