import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { decodePairingCode } from "../lib/pairing";
import { savePairing } from "../lib/storage";
import { testConnection } from "../lib/turso";

interface Props {
  onPaired: () => void;
}

export default function PairScreen({ onPaired }: Props) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePair = async () => {
    setError(null);
    const pairing = decodePairingCode(code);
    if (!pairing) {
      setError("Invalid pairing code. Copy it fresh from Ally Settings → Mobile.");
      return;
    }
    setLoading(true);
    try {
      const ok = await testConnection(pairing);
      if (!ok) {
        setError("Could not reach your Ally database. Check your internet connection.");
        return;
      }
      await savePairing(pairing);
      onPaired();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.foxBadge}>
            <Text style={styles.foxEmoji}>🦊</Text>
          </View>
          <Text style={styles.title}>Ally Mobile</Text>
          <Text style={styles.subtitle}>
            Connect to your desktop to get study reminders.
          </Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Pairing code</Text>
          <Text style={styles.cardHint}>
            Open Ally on your desktop → Settings → Mobile tab → copy the code and paste it below.
          </Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={code}
            onChangeText={(t) => {
              setCode(t);
              setError(null);
            }}
            placeholder="Paste your pairing code here…"
            placeholderTextColor="#6b7a93"
            multiline
            numberOfLines={4}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, loading && styles.btnDisabled]}
            onPress={() => void handlePair()}
            disabled={loading || code.trim().length === 0}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>Connect</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Steps */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>How to get the code</Text>
          {[
            "Open the Ally desktop app",
            "Go to Settings (bottom of the sidebar)",
            'Click the "Mobile" tab',
            'Press "Show pairing code" and copy it',
          ].map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNumber}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#eef2f7" },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingTop: 60,
    gap: 16,
  },
  header: {
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },
  foxBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#f9fbfd",
    borderWidth: 1.5,
    borderColor: "#dde5ee",
    alignItems: "center",
    justifyContent: "center",
  },
  foxEmoji: { fontSize: 36 },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1e2a3d",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7a93",
    textAlign: "center",
    lineHeight: 20,
  },
  card: {
    backgroundColor: "#f9fbfd",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#dde5ee",
    padding: 18,
    gap: 10,
  },
  cardLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7a93",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  cardHint: {
    fontSize: 13,
    color: "#6b7a93",
    lineHeight: 19,
  },
  input: {
    borderWidth: 1,
    borderColor: "#dde5ee",
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    color: "#1e2a3d",
    backgroundColor: "#eef2f7",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    minHeight: 90,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#dc2626",
  },
  errorText: {
    fontSize: 13,
    color: "#dc2626",
  },
  btn: {
    backgroundColor: "#4a6fa5",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#caddec",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4a6fa5",
  },
  stepText: {
    flex: 1,
    fontSize: 13,
    color: "#1e2a3d",
    lineHeight: 20,
  },
});
