import AsyncStorage from "@react-native-async-storage/async-storage";
import { DEFAULT_BLOCKED_PACKAGES } from "../../modules/app-blocker";

const KEY = "ally.blockedPackages.v1";

export async function loadBlockedList(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_BLOCKED_PACKAGES;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_BLOCKED_PACKAGES;
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return DEFAULT_BLOCKED_PACKAGES;
  }
}

export async function saveBlockedList(packages: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(packages));
}
