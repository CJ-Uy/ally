import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { loadPairing, clearPairing } from "../lib/storage";
import {
  fetchSessionSync,
  fetchUpcomingStudyBlocks,
  SessionSync,
  StudyBlock,
} from "../lib/turso";
import { scheduleStudyBlockNotifications } from "../lib/notifications";
import type { PairingData } from "../lib/storage";

interface Props {
  onUnpaired: () => void;
}

function formatTime(ms: number): string {
  const date = new Date(ms);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
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

export default function HomeScreen({ onUnpaired }: Props) {
  const [pairing, setPairing] = useState<PairingData | null>(null);
  const [session, setSession] = useState<SessionSync | null>(null);
  const [blocks, setBlocks] = useState<StudyBlock[]>([]);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  // Poll every 30s in foreground
  useEffect(() => {
    if (!pairing) return;
    pollRef.current = setInterval(() => void refresh(pairing, true), 30_000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [pairing, refresh]);

  const handleDisconnect = async () => {
    await clearPairing();
    onUnpaired();
  };

  const sessionActive = session?.active ?? false;

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={loading}
          onRefresh={() => pairing && void refresh(pairing)}
          tintColor="#4a6fa5"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Study Companion</Text>
          <Text style={styles.title}>Ally</Text>
        </View>
        <View style={[styles.statusDot, sessionActive ? styles.statusDotActive : styles.statusDotIdle]} />
      </View>

      {/* Session card */}
      <View style={[styles.card, sessionActive && styles.cardActive]}>
        <Text style={styles.cardLabel}>Desktop Session</Text>
        {session == null ? (
          <Text style={styles.muted}>Waiting for first sync…</Text>
        ) : sessionActive ? (
          <View style={styles.sessionActiveRow}>
            <View style={styles.activePill}>
              <View style={styles.activePulse} />
              <Text style={styles.activePillText}>ACTIVE</Text>
            </View>
            <Text style={styles.sessionSubject}>
              {session.subject ?? "General study"}
            </Text>
            {session.startedAt && (
              <Text style={styles.muted}>
                Started {formatTime(session.startedAt)}
              </Text>
            )}
          </View>
        ) : (
          <Text style={styles.idleText}>No session running</Text>
        )}
      </View>

      {/* Upcoming study blocks */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.cardLabel}>Upcoming Study Blocks</Text>
          <TouchableOpacity
            onPress={() => pairing && void refresh(pairing)}
            disabled={loading}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#4a6fa5" />
            ) : (
              <Text style={styles.refreshBtn}>Refresh</Text>
            )}
          </TouchableOpacity>
        </View>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : blocks.length === 0 ? (
          <Text style={styles.muted}>No study blocks in the next 25 hours.</Text>
        ) : (
          blocks.map((block) => {
            const mins = minutesUntil(block.startsAt);
            const soon = mins <= 35 && mins > 0;
            return (
              <View key={block.id} style={[styles.blockRow, soon && styles.blockRowSoon]}>
                <View style={styles.blockTimeCol}>
                  <Text style={styles.blockDate}>{formatDate(block.startsAt)}</Text>
                  <Text style={styles.blockTime}>{formatTime(block.startsAt)}</Text>
                </View>
                <View style={styles.blockInfo}>
                  <Text style={styles.blockTitle} numberOfLines={1}>{block.title}</Text>
                  {mins > 0 ? (
                    <Text style={[styles.blockCountdown, soon && styles.blockCountdownSoon]}>
                      {mins < 60 ? `in ${mins} min` : `in ${Math.floor(mins / 60)}h ${mins % 60}m`}
                    </Text>
                  ) : (
                    <Text style={styles.blockCountdownSoon}>Now</Text>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Sync info + disconnect */}
      <View style={styles.footer}>
        {lastSynced && (
          <Text style={styles.footerText}>
            Last synced {lastSynced.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </Text>
        )}
        <TouchableOpacity onPress={() => void handleDisconnect()}>
          <Text style={styles.disconnectText}>Disconnect</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eef2f7" },
  container: { padding: 20, paddingTop: 60, gap: 16, paddingBottom: 40 },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  eyebrow: { fontSize: 11, fontWeight: "600", color: "#6b7a93", textTransform: "uppercase", letterSpacing: 1 },
  title: { fontSize: 28, fontWeight: "700", color: "#1e2a3d", letterSpacing: -0.5, marginTop: 2 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  statusDotIdle: { backgroundColor: "#dde5ee" },
  statusDotActive: { backgroundColor: "#16a34a" },

  card: {
    backgroundColor: "#f9fbfd",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dde5ee",
    padding: 18,
    gap: 10,
  },
  cardActive: {
    borderColor: "#4a6fa5",
    backgroundColor: "#f0f5fc",
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7a93",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  refreshBtn: { fontSize: 13, color: "#4a6fa5", fontWeight: "600" },

  sessionActiveRow: { gap: 6 },
  activePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#dcfce7",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#16a34a",
  },
  activePillText: { fontSize: 11, fontWeight: "700", color: "#15803d", letterSpacing: 0.5 },
  sessionSubject: { fontSize: 18, fontWeight: "600", color: "#1e2a3d" },
  idleText: { fontSize: 15, color: "#6b7a93" },
  muted: { fontSize: 13, color: "#6b7a93", lineHeight: 19 },
  errorText: { fontSize: 13, color: "#dc2626" },

  blockRow: {
    flexDirection: "row",
    gap: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#dde5ee",
  },
  blockRowSoon: { backgroundColor: "#fff9ed", borderRadius: 10, paddingHorizontal: 10, borderTopWidth: 0, marginTop: 4 },
  blockTimeCol: { gap: 2, minWidth: 56 },
  blockDate: { fontSize: 11, color: "#6b7a93", fontWeight: "600" },
  blockTime: { fontSize: 15, fontWeight: "700", color: "#1e2a3d" },
  blockInfo: { flex: 1, gap: 2 },
  blockTitle: { fontSize: 14, fontWeight: "600", color: "#1e2a3d" },
  blockCountdown: { fontSize: 12, color: "#6b7a93" },
  blockCountdownSoon: { fontSize: 12, color: "#f5a66b", fontWeight: "700" },

  footer: { alignItems: "center", gap: 8, marginTop: 4 },
  footerText: { fontSize: 12, color: "#6b7a93" },
  disconnectText: { fontSize: 13, color: "#dc2626" },
});
