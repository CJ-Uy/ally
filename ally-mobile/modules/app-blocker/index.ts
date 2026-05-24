import { requireNativeModule, EventEmitter, type Subscription } from "expo-modules-core";

export const DEFAULT_BLOCKED_PACKAGES = [
  "com.google.android.youtube",
  "com.zhiliaoapp.musically",
  "com.ss.android.ugc.trill",
  "com.instagram.android",
  "com.facebook.katana",
  "com.facebook.orca",
  "com.twitter.android",
  "com.X.android",
  "com.snapchat.android",
  "com.reddit.frontpage",
  "com.netflix.mediaclient",
  "com.amazon.avod.thirdpartyclient",
  "com.disney.disneyplus",
  "com.spotify.music",
  "com.twitch.android.app",
  "com.discord",
  "com.whatsapp",
  "org.telegram.messenger",
  "com.linkedin.android",
  "com.pinterest",
];

export interface InstalledApp {
  packageName: string;
  label: string;
  isSystem: boolean;
}

export interface BlockedAppEvent {
  packageName: string;
  appLabel: string;
}

interface AppBlockerNativeModule {
  hasUsagePermission: () => boolean;
  openUsagePermissionSettings: () => void;
  hasOverlayPermission: () => boolean;
  openOverlayPermissionSettings: () => void;
  openBatteryOptimizationSettings: () => void;
  startWatching: (dbUrl: string, authToken: string, packages: string[]) => void;
  updateBlockedPackages: (packages: string[]) => void;
  stopBlocking: () => void;
  grantBreak: (minutes: number) => void;
  isSessionActive: () => boolean;
  getInstalledApps: () => InstalledApp[];
}

let nativeModule: AppBlockerNativeModule | null = null;
try {
  nativeModule = requireNativeModule<AppBlockerNativeModule>("AppBlocker");
} catch {
  nativeModule = null;
  if (__DEV__) {
    console.warn(
      "[app-blocker] Native module not available — running in Expo Go or simulator. " +
        "Build a dev client / preview APK to enable blocking.",
    );
  }
}

export const isNativeAvailable = (): boolean => nativeModule !== null;

const emitter = nativeModule ? new EventEmitter(nativeModule) : null;

export function hasUsagePermission(): boolean {
  return nativeModule?.hasUsagePermission() ?? false;
}

export function openUsagePermissionSettings(): void {
  nativeModule?.openUsagePermissionSettings();
}

export function hasOverlayPermission(): boolean {
  return nativeModule?.hasOverlayPermission() ?? false;
}

export function openOverlayPermissionSettings(): void {
  nativeModule?.openOverlayPermissionSettings();
}

export function openBatteryOptimizationSettings(): void {
  nativeModule?.openBatteryOptimizationSettings();
}

/**
 * Hands the foreground service everything it needs to run independently:
 * the user's Turso credentials (for session polling) and the package list to
 * block. Safe to call repeatedly — re-calling just updates the stored config.
 */
export function startWatching(
  dbUrl: string,
  authToken: string,
  packages: string[],
): void {
  nativeModule?.startWatching(dbUrl, authToken, packages);
}

export function updateBlockedPackages(packages: string[]): void {
  nativeModule?.updateBlockedPackages(packages);
}

export function stopBlocking(): void {
  nativeModule?.stopBlocking();
}

export function grantBreak(minutes: number): void {
  nativeModule?.grantBreak(minutes);
}

export function isSessionActive(): boolean {
  return nativeModule?.isSessionActive() ?? false;
}

export function getInstalledApps(): InstalledApp[] {
  return nativeModule?.getInstalledApps() ?? [];
}

export function addBlockedAppListener(
  listener: (event: BlockedAppEvent) => void,
): Subscription {
  if (!emitter) return { remove: () => {} } as Subscription;
  return emitter.addListener("onBlockedAppDetected", listener);
}

export function addClearedListener(listener: () => void): Subscription {
  if (!emitter) return { remove: () => {} } as Subscription;
  return emitter.addListener("onBlockedAppCleared", listener);
}
