import * as BackgroundFetch from "expo-background-fetch";
import * as TaskManager from "expo-task-manager";
import { loadPairing } from "../lib/storage";
import { fetchSessionSync, fetchUpcomingStudyBlocks } from "../lib/turso";
import {
  BACKGROUND_TASK_NAME,
  checkSessionChange,
  scheduleStudyBlockNotifications,
} from "../lib/notifications";

TaskManager.defineTask(BACKGROUND_TASK_NAME, async () => {
  try {
    const pairing = await loadPairing();
    if (!pairing) return BackgroundFetch.BackgroundFetchResult.NoData;

    const [session, blocks] = await Promise.all([
      fetchSessionSync(pairing),
      fetchUpcomingStudyBlocks(pairing),
    ]);

    if (session) {
      await checkSessionChange(session.active, session.subject);
    }

    await scheduleStudyBlockNotifications(blocks);
    return BackgroundFetch.BackgroundFetchResult.NewData;
  } catch (err) {
    console.warn("[bg-task] failed:", err);
    return BackgroundFetch.BackgroundFetchResult.Failed;
  }
});

export async function registerBackgroundTask(): Promise<void> {
  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    console.warn("[bg-task] background fetch not available on this device");
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
  if (!isRegistered) {
    await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK_NAME, {
      minimumInterval: 15 * 60, // 15 minutes (Android minimum)
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }
}
