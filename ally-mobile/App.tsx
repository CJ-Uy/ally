import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, StyleSheet } from "react-native";
import { loadPairing } from "./src/lib/storage";
import { requestNotificationPermissions } from "./src/lib/notifications";
import { registerBackgroundTask } from "./src/tasks/background";
import PairScreen from "./src/screens/PairScreen";
import HomeScreen from "./src/screens/HomeScreen";

// Must import to register the task before BackgroundFetch tries to use it
import "./src/tasks/background";

type Screen = "loading" | "pair" | "home";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");

  useEffect(() => {
    const init = async () => {
      await requestNotificationPermissions();
      await registerBackgroundTask();
      const pairing = await loadPairing();
      setScreen(pairing ? "home" : "pair");
    };
    void init();
  }, []);

  if (screen === "loading") return null;

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" backgroundColor="#eef2f7" />
      {screen === "pair" ? (
        <PairScreen onPaired={() => setScreen("home")} />
      ) : (
        <HomeScreen onUnpaired={() => setScreen("pair")} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#eef2f7" },
});
