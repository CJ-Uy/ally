import React, { useCallback, useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { AppState, SafeAreaView, StyleSheet } from "react-native";
import * as Linking from "expo-linking";
import { loadPairing } from "./src/lib/storage";
import { requestNotificationPermissions } from "./src/lib/notifications";
import { registerBackgroundTask } from "./src/tasks/background";
import PairScreen from "./src/screens/PairScreen";
import HomeScreen from "./src/screens/HomeScreen";
import AppPickerScreen from "./src/screens/AppPickerScreen";
import NegotiateScreen from "./src/screens/NegotiateScreen";
import OnboardingScreen from "./src/screens/OnboardingScreen";
import {
  addBlockedAppListener,
  addClearedListener,
  hasOverlayPermission,
  hasUsagePermission,
  isNativeAvailable,
} from "./modules/app-blocker";

import "./src/tasks/background";

type Screen = "loading" | "pair" | "onboarding" | "home" | "picker" | "negotiate";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [blockedAppName, setBlockedAppName] = useState<string>("");

  // Decides which screen to land on after pairing exists.
  const decidePostPairScreen = useCallback((): Screen => {
    if (!isNativeAvailable()) return "home";
    if (hasUsagePermission() && hasOverlayPermission()) return "home";
    return "onboarding";
  }, []);

  useEffect(() => {
    const init = async () => {
      await requestNotificationPermissions();
      await registerBackgroundTask();
      const pairing = await loadPairing();
      if (!pairing) {
        setScreen("pair");
        return;
      }
      setScreen(decidePostPairScreen());
    };
    void init();
  }, [decidePostPairScreen]);

  // Re-evaluate when the user comes back from Settings — handles the case
  // where they grant a permission while on Home so we don't get stuck.
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      if (screen === "onboarding") {
        // Only auto-advance once both perms are granted.
        if (isNativeAvailable() && hasUsagePermission() && hasOverlayPermission()) {
          // User can also tap "Finish setup" manually; this is a fallback.
        }
      }
    });
    return () => sub.remove();
  }, [screen]);

  useEffect(() => {
    const blockSub = addBlockedAppListener(({ appLabel }) => {
      setBlockedAppName(appLabel);
    });
    const clearSub = addClearedListener(() => {
      setScreen((s) => (s === "negotiate" ? "home" : s));
    });
    return () => {
      blockSub.remove();
      clearSub.remove();
    };
  }, []);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url) return;
      try {
        const parsed = Linking.parse(url);
        if (parsed.hostname === "negotiate" || parsed.path === "negotiate") {
          const app = parsed.queryParams?.app;
          if (typeof app === "string" && app.length > 0) setBlockedAppName(app);
          setScreen("negotiate");
        }
      } catch {
        // ignore
      }
    };
    void Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener("url", (ev) => handleUrl(ev.url));
    return () => sub.remove();
  }, []);

  if (screen === "loading") return null;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" backgroundColor="#eef2f7" />
      {screen === "pair" && (
        <PairScreen onPaired={() => setScreen(decidePostPairScreen())} />
      )}
      {screen === "onboarding" && (
        <OnboardingScreen onDone={() => setScreen("home")} />
      )}
      {screen === "home" && (
        <HomeScreen
          onUnpaired={() => setScreen("pair")}
          onOpenPicker={() => setScreen("picker")}
          onNeedsOnboarding={() => setScreen("onboarding")}
        />
      )}
      {screen === "picker" && <AppPickerScreen onClose={() => setScreen("home")} />}
      {screen === "negotiate" && (
        <NegotiateScreen
          blockedApp={blockedAppName || "this app"}
          onClose={() => setScreen("home")}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eef2f7" },
});
