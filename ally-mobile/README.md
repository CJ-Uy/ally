# Ally Mobile

Android companion app for the Ally desktop study app. Connects to your Turso database to show upcoming study blocks and notify you when sessions start.

## Features

- **30-min study block reminders** — local notification before each scheduled study block on your Ally calendar
- **Session alerts** — notified when a study session starts or ends on the desktop
- **Live home screen** — shows current session state and upcoming blocks, pulls fresh from Turso on demand
- **Background sync** — polls every ~15 minutes even when the app is closed

## Prerequisites

- [pnpm](https://pnpm.io) installed
- An [Expo account](https://expo.dev) (free) for building the APK
- Ally desktop app running with `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` set

## Install dependencies

Run this from inside the `ally-mobile/` folder. The `--ignore-workspace` flag is required because this project lives inside the `ally` repo but is independent of its pnpm workspace.

```bash
pnpm install --ignore-workspace
```

## Pairing

1. Open Ally desktop → **Settings** → **Mobile** tab
2. Click **Show pairing code** and copy it
3. Open the mobile app, paste the code, tap **Connect**

The code is a base64-encoded string containing your Turso URL and auth token. Treat it like a password.

## Development (no APK needed)

Install [Expo Go](https://expo.dev/go) on your Android device, then:

```bash
pnpm start
```

Scan the QR code with the Expo Go app. Full hot-reload dev experience.

## Building the APK

```bash
# First time only — log in to Expo
pnpm dlx eas-cli login

# Build a preview APK (no Play Store needed)
pnpm dlx eas-cli build -p android --profile preview
```

Build runs on Expo's cloud CI (~5–10 min). When done, Expo prints a download URL — open it on your Android device and tap **Install**.

> **Android setting required:** Enable *Install from unknown sources* in Android settings before installing.

## If you need a clean reinstall

```bash
Remove-Item -Recurse -Force node_modules   # PowerShell
Remove-Item -Force pnpm-lock.yaml
pnpm install --ignore-workspace
```

## Project structure

```
ally-mobile/
├── App.tsx                      # Root — init, permissions, screen routing
├── app.json                     # Expo config
├── eas.json                     # EAS build profiles (preview = APK)
├── pnpm-workspace.yaml          # Makes this an independent pnpm workspace
├── src/
│   ├── lib/
│   │   ├── turso.ts             # Turso HTTP API client (fetch-based, no native deps)
│   │   ├── pairing.ts           # Decode pairing code from desktop
│   │   ├── storage.ts           # AsyncStorage helpers
│   │   └── notifications.ts     # Schedule + fire local notifications
│   ├── screens/
│   │   ├── PairScreen.tsx       # First-run pairing flow
│   │   └── HomeScreen.tsx       # Main dashboard
│   └── tasks/
│       └── background.ts        # Background fetch task registration
```

## How it connects to the desktop

No WebSocket or local network needed. The mobile app queries your **Turso cloud database** directly using its HTTP API. The desktop writes live session state to a `session_sync` table on session start/stop; the mobile app reads it on each poll.

| Data source | How phone reads it |
|---|---|
| Scheduled study blocks | `events` table (`type = 'study_block'`) |
| Manual session state | `session_sync` table (upserted by desktop on start/stop) |
