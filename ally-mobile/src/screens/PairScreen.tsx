import React, { useState } from "react";
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
import { decodePairingCode } from "../lib/pairing";
import { savePairing } from "../lib/storage";
import { testConnection } from "../lib/turso";

const allyImage = require("../../assets/ally.png");

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
      setError("Invalid code. Copy it fresh from Ally Settings → Mobile.");
      return;
    }
    setLoading(true);
    try {
      const ok = await testConnection(pairing);
      if (!ok) {
        setError("Could not reach your database. Check your internet connection.");
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
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.imageWrap}>
            <Image source={allyImage} style={styles.allyImage} resizeMode="contain" />
          </View>
          <Text style={styles.title}>Ally Mobile</Text>
          <Text style={styles.subtitle}>
            Your study companion on the go. Pair with your desktop to get session alerts and study reminders.
          </Text>
        </View>

        {/* Pairing card */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Pairing code</Text>
          <Text style={styles.cardHint}>
            Open Ally on your desktop → Settings → Mobile tab → copy the code and paste it below.
          </Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={code}
            onChangeText={(t) => { setCode(t); setError(null); }}
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
            style={[styles.btn, (loading || code.trim().length === 0) && styles.btnDisabled]}
            onPress={() => void handlePair()}
            disabled={loading || code.trim().length === 0}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.btnText}>Connect to Ally</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Steps */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>How to get the code</Text>
          {[
            "Open the Ally desktop app",
            "Go to Settings (bottom of the sidebar)",
            "Click the \"Mobile\" tab",
            "Press \"Show pairing code\" and copy it",
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
    padding: 24,
    paddingTop: 56,
    gap: 16,
    paddingBottom: 48,
  },

  hero: {
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  imageWrap: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#f9fbfd",
    borderWidth: 1.5,
    borderColor: "#dde5ee",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#4a6fa5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  allyImage: {
    width: 90,
    height: 90,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#1e2a3d",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: "#6b7a93",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300,
  },

  card: {
    backgroundColor: "#f9fbfd",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#dde5ee",
    padding: 20,
    gap: 12,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6b7a93",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  cardHint: {
    fontSize: 13,
    color: "#6b7a93",
    lineHeight: 20,
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#dde5ee",
    borderRadius: 12,
    padding: 14,
    fontSize: 12,
    color: "#1e2a3d",
    backgroundColor: "#eef2f7",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    minHeight: 96,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#dc2626",
  },
  errorText: {
    fontSize: 13,
    color: "#dc2626",
    lineHeight: 18,
  },
  btn: {
    backgroundColor: "#4a6fa5",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 2,
    shadowColor: "#4a6fa5",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnDisabled: {
    opacity: 0.45,
    elevation: 0,
    shadowOpacity: 0,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#caddec",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
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
    lineHeight: 22,
  },
});
