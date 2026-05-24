import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet } from "react-native";
import * as Linking from "expo-linking";
import { loadPairing } from "./src/lib/storage";
import { requestNotificationPermissions } from "./src/lib/notifications";
import { registerBackgroundTask } from "./src/tasks/background";
import PairScreen from "./src/screens/PairScreen";
import HomeScreen from "./src/screens/HomeScreen";
import AppPickerScreen from "./src/screens/AppPickerScreen";
import NegotiateScreen from "./src/screens/NegotiateScreen";
import { addBlockedAppListener, addClearedListener } from "./modules/app-blocker";

// Must import to register the task before BackgroundFetch tries to use it
import "./src/tasks/background";

type Screen = "loading" | "pair" | "home" | "picker" | "negotiate";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [blockedAppName, setBlockedAppName] = useState<string>("");

  useEffect(() => {
    const init = async () => {
      await requestNotificationPermissions();
      await registerBackgroundTask();
      const pairing = await loadPairing();
      setScreen(pairing ? "home" : "pair");
    };
    void init();
  }, []);

  // Listen for blocker events — we use these to track which app is blocked so
  // that when the user taps "Negotiate" in the overlay (which deep-links us
  // back into the app), we know which app to mention.
  useEffect(() => {
    const blockSub = addBlockedAppListener(({ appLabel }) => {
      setBlockedAppName(appLabel);
    });
    const clearSub = addClearedListener(() => {
      // If we're showing the negotiate screen and the user already left the
      // blocked app, drop back to home.
      setScreen((s) => (s === "negotiate" ? "home" : s));
    });
    return () => {
      blockSub.remove();
      clearSub.remove();
    };
  }, []);

  // Deep link handler — ally://negotiate?app=YouTube fires from the overlay
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
      {screen === "pair" && <PairScreen onPaired={() => setScreen("home")} />}
      {screen === "home" && (
        <HomeScreen
          onUnpaired={() => setScreen("pair")}
          onOpenPicker={() => setScreen("picker")}
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
