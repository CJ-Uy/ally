import React, { useCallback, useEffect, useState } from "react";
import {
  AppState,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  hasUsagePermission,
  hasOverlayPermission,
  openUsagePermissionSettings,
  openOverlayPermissionSettings,
  openBatteryOptimizationSettings,
} from "../../modules/app-blocker";
import allyImage from "../../assets/ally.png";

interface Props {
  onDone: () => void;
}

interface Step {
  key: "usage" | "overlay" | "battery";
  title: string;
  icon: string;
  description: string;
  cta: string;
  open: () => void;
  isComplete: () => boolean;
  // Battery has no API to check status reliably — treat as soft requirement.
  optional?: boolean;
}

const STEPS: Step[] = [
  {
    key: "usage",
    title: "Usage Access",
    icon: "👁",
    description:
      "Lets Ally see which app is in the foreground so it knows when to block distractions.",
    cta: "Grant Usage Access",
    open: openUsagePermissionSettings,
    isComplete: () => hasUsagePermission(),
  },
  {
    key: "overlay",
    title: "Display Over Other Apps",
    icon: "🪟",
    description:
      "Lets Ally draw the block screen on top of distracting apps when a session is active.",
    cta: "Grant Overlay Permission",
    open: openOverlayPermissionSettings,
    isComplete: () => hasOverlayPermission(),
  },
  {
    key: "battery",
    title: "Ignore Battery Optimization",
    icon: "🔋",
    description:
      "Stops Android from killing the blocker after long study sessions. Recommended but optional.",
    cta: "Open Battery Settings",
    open: openBatteryOptimizationSettings,
    isComplete: () => true, // Can't reliably introspect — user marks done.
    optional: true,
  },
];

export default function OnboardingScreen({ onDone }: Props) {
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  const refresh = useCallback(() => {
    const next: Record<string, boolean> = {};
    for (const s of STEPS) {
      next[s.key] = s.optional ? !!completed[s.key] : s.isComplete();
    }
    setCompleted(next);
  }, [completed]);

  // Re-check perms when the app comes back from Settings.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh();
    });
    refresh();
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requiredDone = STEPS.filter((s) => !s.optional).every(
    (s) => completed[s.key],
  );

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.imageWrap}>
          <Image source={allyImage} style={styles.image} resizeMode="contain" />
        </View>
        <Text style={styles.title}>Set up the blocker</Text>
        <Text style={styles.subtitle}>
          Two quick permissions and Ally will block distracting apps during your study sessions.
        </Text>
      </View>

      {STEPS.map((step, i) => {
        const done = completed[step.key];
        return (
          <View key={step.key} style={[styles.card, done && styles.cardDone]}>
            <View style={styles.cardHeader}>
              <View style={styles.stepBadge}>
                {done ? (
                  <Text style={styles.stepCheck}>✓</Text>
                ) : (
                  <Text style={styles.stepNumber}>{i + 1}</Text>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>
                  {step.icon} {step.title}
                  {step.optional && <Text style={styles.optionalTag}>  · optional</Text>}
                </Text>
                <Text style={styles.cardDescription}>{step.description}</Text>
              </View>
            </View>

            {!done && (
              <TouchableOpacity
                style={styles.btn}
                onPress={() => {
                  step.open();
                  if (step.optional) {
                    setCompleted((p) => ({ ...p, [step.key]: true }));
                  }
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.btnText}>{step.cta}</Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}

      <TouchableOpacity
        style={[styles.finishBtn, !requiredDone && styles.finishBtnDisabled]}
        onPress={onDone}
        disabled={!requiredDone}
        activeOpacity={0.85}
      >
        <Text style={styles.finishBtnText}>
          {requiredDone ? "Finish setup" : "Complete the required steps"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onDone} style={styles.skipLink}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eef2f7" },
  container: { padding: 24, paddingTop: 56, gap: 16, paddingBottom: 48 },

  hero: { alignItems: "center", marginBottom: 8, gap: 12 },
  imageWrap: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "#f9fbfd", borderWidth: 1.5, borderColor: "#dde5ee",
    alignItems: "center", justifyContent: "center",
  },
  image: { width: 70, height: 70 },
  title: { fontSize: 26, fontWeight: "700", color: "#1e2a3d", letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: "#6b7a93", textAlign: "center", lineHeight: 22, maxWidth: 320 },

  card: {
    backgroundColor: "#f9fbfd", borderRadius: 16, borderWidth: 1,
    borderColor: "#dde5ee", padding: 18, gap: 14,
  },
  cardDone: { borderColor: "#86efac", backgroundColor: "#f0fdf4" },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: 12 },

  stepBadge: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: "#caddec",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  stepNumber: { fontSize: 13, fontWeight: "700", color: "#4a6fa5" },
  stepCheck: { fontSize: 16, fontWeight: "700", color: "#15803d" },

  cardTitle: { fontSize: 15, fontWeight: "700", color: "#1e2a3d", marginBottom: 4 },
  optionalTag: { fontSize: 12, color: "#8fa3c0", fontWeight: "500" },
  cardDescription: { fontSize: 13, color: "#6b7a93", lineHeight: 19 },

  btn: {
    backgroundColor: "#4a6fa5",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  btnText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },

  finishBtn: {
    backgroundColor: "#1e2a3d",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    shadowColor: "#1e2a3d",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  finishBtnDisabled: { opacity: 0.4, elevation: 0, shadowOpacity: 0 },
  finishBtnText: { color: "#ffffff", fontSize: 15, fontWeight: "700", letterSpacing: 0.3 },

  skipLink: { alignItems: "center", paddingVertical: 8 },
  skipText: { color: "#6b7a93", fontSize: 13, textDecorationLine: "underline" },
});
