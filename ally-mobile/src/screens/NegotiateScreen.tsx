import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  continueNegotiation,
  createNegotiation,
  fetchNegotiation,
  type NegotiationRecord,
} from "../lib/negotiations";
import { loadPairing } from "../lib/storage";
import { grantBreak } from "../../modules/app-blocker";
import allyImage from "../../assets/ally.png";

interface Props {
  blockedApp: string;
  onClose: () => void;
}

const POLL_MS = 2500;
const POLL_TIMEOUT_MS = 60_000;

interface Message {
  role: "user" | "model";
  text: string;
}

export default function NegotiateScreen({ blockedApp, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [negotiationId, setNegotiationId] = useState<number | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [decided, setDecided] = useState<NegotiationRecord["status"] | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, waiting]);

  const pollUntilReply = useCallback(async (id: number, lastReplyCount: number) => {
    const started = Date.now();
    while (Date.now() - started < POLL_TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      const pairing = await loadPairing();
      if (!pairing) throw new Error("Lost pairing");
      const rec = await fetchNegotiation(pairing, id);
      if (!rec) continue;
      if (rec.conversation.length > lastReplyCount && rec.status !== "pending") {
        return rec;
      }
      if (rec.status === "granted" || rec.status === "denied") {
        return rec;
      }
    }
    throw new Error("Ally is taking too long to respond. Try again.");
  }, []);

  const handleReply = useCallback((rec: NegotiationRecord) => {
    setMessages(rec.conversation);
    if (rec.status === "granted" && rec.minutesGranted) {
      setDecided("granted");
      grantBreak(rec.minutesGranted);
      // Auto-close after a short delay so the user sees confirmation
      setTimeout(onClose, 2500);
    } else if (rec.status === "denied") {
      setDecided("denied");
    }
  }, [onClose]);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || waiting || decided) return;
    setInput("");
    setError(null);
    setWaiting(true);

    // Optimistic user message
    const optimistic: Message = { role: "user", text };
    setMessages((prev) => [...prev, optimistic]);

    try {
      const pairing = await loadPairing();
      if (!pairing) throw new Error("Not paired with desktop");

      let id = negotiationId;
      const priorCount = messages.length; // before optimistic add

      if (id === null) {
        id = await createNegotiation(pairing, blockedApp, text);
        setNegotiationId(id);
      } else {
        await continueNegotiation(pairing, id, text);
      }

      const rec = await pollUntilReply(id, priorCount + 1);
      handleReply(rec);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reach Ally");
      // Roll back optimistic message
      setMessages((prev) => prev.slice(0, -1));
      setInput(text);
    } finally {
      setWaiting(false);
    }
  }, [input, waiting, decided, negotiationId, messages.length, blockedApp, pollUntilReply, handleReply]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} hitSlop={10}>
          <Text style={styles.closeText}>Close</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Image source={allyImage} style={styles.headerImage} resizeMode="contain" />
          <Text style={styles.title}>Negotiate with Ally</Text>
        </View>
        <View style={{ width: 50 }} />
      </View>

      <View style={styles.blockedBanner}>
        <Text style={styles.blockedBannerLabel}>Requesting access to</Text>
        <Text style={styles.blockedBannerApp}>{blockedApp}</Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && !waiting && (
          <View style={styles.intro}>
            <Image source={allyImage} style={styles.introImage} resizeMode="contain" />
            <Text style={styles.introText}>
              Tell Ally why you need to open {blockedApp}.{"\n"}
              Be honest — Ally decides whether to grant you a short break.
            </Text>
          </View>
        )}

        {messages.map((m, i) => (
          <View
            key={i}
            style={[
              styles.bubble,
              m.role === "user" ? styles.bubbleUser : styles.bubbleModel,
            ]}
          >
            <Text style={m.role === "user" ? styles.bubbleUserText : styles.bubbleModelText}>
              {m.text}
            </Text>
          </View>
        ))}

        {waiting && (
          <View style={[styles.bubble, styles.bubbleModel, styles.bubbleTyping]}>
            <ActivityIndicator size="small" color="#4a6fa5" />
            <Text style={styles.typingText}>Ally is thinking...</Text>
          </View>
        )}

        {decided === "granted" && (
          <View style={styles.verdictGranted}>
            <Text style={styles.verdictGrantedText}>
              ✓ Break granted. Closing the block screen...
            </Text>
          </View>
        )}
        {decided === "denied" && (
          <View style={styles.verdictDenied}>
            <Text style={styles.verdictDeniedText}>
              Ally won't grant a break right now. Stay focused!
            </Text>
          </View>
        )}
      </ScrollView>

      {error && <Text style={styles.errorText}>{error}</Text>}

      {!decided && (
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Make your case..."
            placeholderTextColor="#8fa3c0"
            multiline
            maxLength={500}
            editable={!waiting}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || waiting) && styles.sendBtnDisabled]}
            onPress={onSend}
            disabled={!input.trim() || waiting}
          >
            <Text style={styles.sendBtnText}>Send</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eef2f7" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#dde5ee",
  },
  closeText: { fontSize: 15, color: "#6b7a93", fontWeight: "500" },
  headerCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerImage: { width: 28, height: 28 },
  title: { fontSize: 16, fontWeight: "700", color: "#1e2a3d" },

  blockedBanner: {
    backgroundColor: "#fff7ed",
    borderBottomWidth: 1,
    borderBottomColor: "#fed7aa",
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  blockedBannerLabel: { fontSize: 11, color: "#c2410c", fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" },
  blockedBannerApp: { fontSize: 16, color: "#9a3412", fontWeight: "700", marginTop: 2 },

  chatScroll: { flex: 1 },
  chatContent: { padding: 16, gap: 10 },

  intro: { alignItems: "center", paddingVertical: 32, gap: 12 },
  introImage: { width: 56, height: 56, opacity: 0.6 },
  introText: { fontSize: 14, color: "#6b7a93", textAlign: "center", lineHeight: 20 },

  bubble: { maxWidth: "85%", padding: 12, borderRadius: 16 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: "#4a6fa5", borderBottomRightRadius: 4 },
  bubbleModel: { alignSelf: "flex-start", backgroundColor: "#ffffff", borderBottomLeftRadius: 4, borderWidth: 1, borderColor: "#dde5ee" },
  bubbleUserText: { color: "#ffffff", fontSize: 14, lineHeight: 20 },
  bubbleModelText: { color: "#1e2a3d", fontSize: 14, lineHeight: 20 },
  bubbleTyping: { flexDirection: "row", alignItems: "center", gap: 8 },
  typingText: { fontSize: 13, color: "#6b7a93", fontStyle: "italic" },

  verdictGranted: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  verdictGrantedText: { color: "#15803d", fontSize: 14, fontWeight: "600", textAlign: "center" },
  verdictDenied: {
    backgroundColor: "#fef2f2",
    borderColor: "#fecaca",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
  },
  verdictDeniedText: { color: "#b91c1c", fontSize: 14, fontWeight: "600", textAlign: "center" },

  errorText: { color: "#dc2626", fontSize: 13, paddingHorizontal: 20, paddingBottom: 8 },

  inputRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: "#dde5ee",
    backgroundColor: "#ffffff",
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#f9fbfd",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1e2a3d",
    borderWidth: 1,
    borderColor: "#dde5ee",
  },
  sendBtn: {
    backgroundColor: "#4a6fa5",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "700" },
});
