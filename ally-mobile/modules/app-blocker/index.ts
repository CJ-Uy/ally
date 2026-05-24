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

// Try to load the native module. In Expo Go (`pnpm start`), it won't exist —
// fall back to a no-op stub so the JS bundle still runs for UI iteration.
let nativeModule: any = null;
try {
  nativeModule = requireNativeModule("AppBlocker");
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

export function startBlocking(packages: string[]): void {
  nativeModule?.startBlocking(packages);
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
