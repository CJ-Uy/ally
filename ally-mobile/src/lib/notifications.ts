import * as Notifications from "expo-notifications";
import { StudyBlock } from "./turso";
import {
  loadLastSessionState,
  loadScheduledEventIds,
  saveLastSessionState,
  saveScheduledEventIds,
} from "./storage";

export const BACKGROUND_TASK_NAME = "ally-background-sync";

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleStudyBlockNotifications(
  blocks: StudyBlock[],
): Promise<void> {
  const alreadyScheduled = await loadScheduledEventIds();
  const newlyScheduled: number[] = [...alreadyScheduled];

  for (const block of blocks) {
    if (alreadyScheduled.includes(block.id)) continue;

    const notifyAt = block.startsAt - 30 * 60 * 1000;
    if (notifyAt <= Date.now()) continue; // already past the 30-min window

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Study block in 30 minutes",
        body: block.title,
        data: { eventId: block.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: new Date(notifyAt),
      },
    });

    newlyScheduled.push(block.id);
  }

  // Prune IDs that are no longer upcoming so the list stays small
  const upcomingIds = blocks.map((b) => b.id);
  const pruned = newlyScheduled.filter((id) => upcomingIds.includes(id));
  await saveScheduledEventIds(pruned);
}

export async function checkSessionChange(
  active: boolean,
  subject: string | null,
): Promise<void> {
  const wasActive = await loadLastSessionState();
  if (active === wasActive) return;

  await saveLastSessionState(active);

  if (active) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Study session started",
        body: subject ? `Subject: ${subject}` : "Ally session is now active.",
      },
      trigger: null, // fire immediately
    });
  } else {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Session ended",
        body: "Your Ally study session has finished.",
      },
      trigger: null,
    });
  }
}

// Configure how notifications look while app is foregrounded
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }),
});
