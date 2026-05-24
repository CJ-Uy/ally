import React, { useRef, useState } from "react";
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
import { CameraView, useCameraPermissions } from "expo-camera";
import { decodePairingCode } from "../lib/pairing";
import { savePairing } from "../lib/storage";
import { testConnection } from "../lib/turso";
import allyImage from "../../assets/ally.png";

interface Props {
  onPaired: () => void;
}

type Mode = "qr" | "text";

export default function PairScreen({ onPaired }: Props) {
  const [mode, setMode] = useState<Mode>("qr");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const lastScanRef = useRef<string | null>(null);

  const tryPair = async (raw: string) => {
    setError(null);
    const pairing = decodePairingCode(raw);
    if (!pairing) {
      setError("Invalid pairing data. Try the latest code from Ally desktop.");
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

  const onBarcodeScanned = ({ data }: { data: string }) => {
    if (loading) return;
    if (lastScanRef.current === data) return;
    lastScanRef.current = data;
    void tryPair(data);
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
        <View style={styles.hero}>
          <View style={styles.imageWrap}>
            <Image source={allyImage} style={styles.allyImage} resizeMode="contain" />
          </View>
          <Text style={styles.title}>Ally Mobile</Text>
          <Text style={styles.subtitle}>
            Pair with your desktop to get session alerts, study reminders, and the focus blocker.
          </Text>
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === "qr" && styles.tabActive]}
            onPress={() => setMode("qr")}
          >
            <Text style={[styles.tabText, mode === "qr" && styles.tabTextActive]}>
              Scan QR
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === "text" && styles.tabActive]}
            onPress={() => setMode("text")}
          >
            <Text style={[styles.tabText, mode === "text" && styles.tabTextActive]}>
              Paste code
            </Text>
          </TouchableOpacity>
        </View>

        {mode === "qr" ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Scan from desktop</Text>
            <Text style={styles.cardHint}>
              In Ally desktop → Settings → Mobile → press "Show pairing code". Point your camera at the QR.
            </Text>

            {!permission ? (
              <View style={styles.cameraPlaceholder}>
                <ActivityIndicator color="#4a6fa5" />
              </View>
            ) : !permission.granted ? (
              <View style={styles.cameraPlaceholder}>
                <Text style={styles.placeholderText}>
                  Ally needs camera access to scan the QR code.
                </Text>
                <TouchableOpacity style={styles.btn} onPress={() => void requestPermission()}>
                  <Text style={styles.btnText}>Grant camera access</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.cameraWrap}>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
                  onBarcodeScanned={loading ? undefined : onBarcodeScanned}
                />
                <View style={styles.reticle} pointerEvents="none" />
                {loading && (
                  <View style={styles.cameraLoading}>
                    <ActivityIndicator color="#ffffff" size="large" />
                    <Text style={styles.cameraLoadingText}>Connecting…</Text>
                  </View>
                )}
              </View>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Pairing code</Text>
            <Text style={styles.cardHint}>
              Open Ally desktop → Settings → Mobile → "Text code" → copy and paste below.
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
              onPress={() => void tryPair(code)}
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
        )}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>How to get the code</Text>
          {[
            "Open the Ally desktop app",
            "Go to Settings (bottom of the sidebar)",
            "Click the \"Mobile\" tab",
            "Press \"Show pairing code\" — scan the QR or copy the text code",
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
  container: { flexGrow: 1, padding: 24, paddingTop: 56, gap: 16, paddingBottom: 48 },

  hero: { alignItems: "center", marginBottom: 8, gap: 12 },
  imageWrap: {
    width: 110, height: 110, borderRadius: 55,
    backgroundColor: "#f9fbfd", borderWidth: 1.5, borderColor: "#dde5ee",
    alignItems: "center", justifyContent: "center", overflow: "hidden",
    shadowColor: "#4a6fa5", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 4,
  },
  allyImage: { width: 90, height: 90 },
  title: { fontSize: 30, fontWeight: "700", color: "#1e2a3d", letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: "#6b7a93", textAlign: "center", lineHeight: 22, maxWidth: 320 },

  tabs: {
    flexDirection: "row",
    backgroundColor: "#f9fbfd",
    borderRadius: 12,
    padding: 4,
    borderWidth: 1,
    borderColor: "#dde5ee",
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "#ffffff", shadowColor: "#4a6fa5", shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  tabText: { fontSize: 13, color: "#6b7a93", fontWeight: "600" },
  tabTextActive: { color: "#1e2a3d" },

  card: {
    backgroundColor: "#f9fbfd", borderRadius: 16, borderWidth: 1,
    borderColor: "#dde5ee", padding: 20, gap: 12,
  },
  cardLabel: {
    fontSize: 11, fontWeight: "700", color: "#6b7a93",
    textTransform: "uppercase", letterSpacing: 1,
  },
  cardHint: { fontSize: 13, color: "#6b7a93", lineHeight: 20 },

  cameraWrap: {
    width: "100%", aspectRatio: 1, borderRadius: 12, overflow: "hidden",
    backgroundColor: "#1e2a3d", position: "relative",
  },
  camera: { flex: 1 },
  reticle: {
    position: "absolute", top: "15%", left: "15%", right: "15%", bottom: "15%",
    borderWidth: 3, borderColor: "rgba(147, 197, 253, 0.7)", borderRadius: 16,
  },
  cameraLoading: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(30, 42, 61, 0.7)",
    alignItems: "center", justifyContent: "center", gap: 10,
  },
  cameraLoadingText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  cameraPlaceholder: {
    width: "100%", aspectRatio: 1, borderRadius: 12,
    backgroundColor: "#eef2f7", alignItems: "center", justifyContent: "center",
    gap: 14, padding: 24,
  },
  placeholderText: { color: "#6b7a93", fontSize: 13, textAlign: "center", lineHeight: 20 },

  input: {
    borderWidth: 1.5, borderColor: "#dde5ee", borderRadius: 12,
    padding: 14, fontSize: 12, color: "#1e2a3d", backgroundColor: "#eef2f7",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    minHeight: 96, textAlignVertical: "top",
  },
  inputError: { borderColor: "#dc2626" },
  errorText: { fontSize: 13, color: "#dc2626", lineHeight: 18 },

  btn: {
    backgroundColor: "#4a6fa5", borderRadius: 12, paddingVertical: 14,
    paddingHorizontal: 20, alignItems: "center", marginTop: 2,
    shadowColor: "#4a6fa5", shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  btnDisabled: { opacity: 0.45, elevation: 0, shadowOpacity: 0 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "600", letterSpacing: 0.2 },

  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepBadge: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: "#caddec",
    alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0,
  },
  stepNumber: { fontSize: 12, fontWeight: "700", color: "#4a6fa5" },
  stepText: { flex: 1, fontSize: 13, color: "#1e2a3d", lineHeight: 22 },
});
