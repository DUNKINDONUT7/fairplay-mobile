import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Local (on-device) notifications only — there is no push-notification
// server/device-token infrastructure anywhere in the existing backend, and
// building one (FCM/APNs credentials, token storage, a sending Edge
// Function) is a separate, much larger project. This gives organizers the
// same "something happened" alert while realtime changes come in, without
// inventing new server-side plumbing.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let permissionRequested = false;

export async function requestNotificationPermissions(): Promise<boolean> {
  if (permissionRequested) return true;
  permissionRequested = true;

  try {
    const existing = await Notifications.getPermissionsAsync();
    if (existing.status === 'granted') return true;

    const requested = await Notifications.requestPermissionsAsync();
    return requested.status === 'granted';
  } catch {
    return false;
  }
}

export async function presentLocalNotification(title: string, body: string): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: { title, body, sound: Platform.OS === 'ios' ? 'default' : undefined },
      trigger: null,
    });
  } catch {
    // Notifications are a nice-to-have; a failure here should never break
    // the organizer's actual workflow.
  }
}
