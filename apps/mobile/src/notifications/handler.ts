import { AppState, Platform } from 'react-native';

let appActive = true;
let unreadCount = 0;

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    appActive = state === 'active';
    if (appActive) {
      unreadCount = 0;
      try {
        const Notifications = require('expo-notifications');
        Notifications.setBadgeCountAsync(0);
      } catch {}
    }
  });
}

export function handleIncomingMessage(msg: any, partnerName?: string) {
  if (appActive || Platform.OS === 'web') return;
  unreadCount += 1;
  const preview = msg.type === 'image' ? '📷 Imagen' : (msg.content || '').slice(0, 100);
  const title = partnerName || 'Nuevo mensaje';

  try {
    const Notifications = require('expo-notifications');

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('messages', {
        name: 'Mensajes',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      }).catch(() => {});
    }

    Notifications.presentNotificationAsync({
      title,
      body: preview,
      data: { conversationId: msg.conversationId },
      badge: unreadCount,
    }).catch(() => {});
  } catch {}
}
