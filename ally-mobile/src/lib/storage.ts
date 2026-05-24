import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  PAIRING: "ally:pairing",
  LAST_SESSION_STATE: "ally:last_session_active",
  SCHEDULED_EVENT_IDS: "ally:scheduled_event_ids",
} as const;

export interface PairingData {
  dbUrl: string;
  authToken: string;
}

export async function savePairing(data: PairingData): Promise<void> {
  await AsyncStorage.setItem(KEYS.PAIRING, JSON.stringify(data));
}

export async function loadPairing(): Promise<PairingData | null> {
  const raw = await AsyncStorage.getItem(KEYS.PAIRING);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PairingData;
  } catch {
    return null;
  }
}

export async function clearPairing(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.PAIRING);
}

export async function saveLastSessionState(active: boolean): Promise<void> {
  await AsyncStorage.setItem(KEYS.LAST_SESSION_STATE, active ? "1" : "0");
}

export async function loadLastSessionState(): Promise<boolean> {
  const val = await AsyncStorage.getItem(KEYS.LAST_SESSION_STATE);
  return val === "1";
}

export async function loadScheduledEventIds(): Promise<number[]> {
  const raw = await AsyncStorage.getItem(KEYS.SCHEDULED_EVENT_IDS);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

export async function saveScheduledEventIds(ids: number[]): Promise<void> {
  await AsyncStorage.setItem(KEYS.SCHEDULED_EVENT_IDS, JSON.stringify(ids));
}
