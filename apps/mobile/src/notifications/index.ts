import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

let notificationTapHandler: ((convId: string) => void) | null = null;

export function setNotificationTapHandler(handler: (convId: string) => void) {
  notificationTapHandler = handler;
}

export async function requestPermissions(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function showMessageNotification(
  conversationId: string,
  senderName: string,
  content: string,
  count: number = 1,
) {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('messages', {
      name: 'Mensajes',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  await Notifications.presentNotificationAsync({
    title: senderName,
    body: content,
    data: { conversationId },
    badge: count,
  });
}

export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

export function addNotificationTapListener() {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const convId = response.notification.request.content.data?.conversationId;
    if (convId && notificationTapHandler) {
      notificationTapHandler(convId);
    }
  });
  return subscription;
}
