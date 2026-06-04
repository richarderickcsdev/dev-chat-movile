import { AppState, Platform } from 'react-native';

let unreadCount = 0;

if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      unreadCount = 0;
      try {
        require('expo-notifications').setBadgeCountAsync(0).catch(() => {});
      } catch {}
    }
  });
}

function isAppActive(): boolean {
  try {
    return AppState.currentState === 'active';
  } catch {
    return true;
  }
}

export function handleIncomingMessage(msg: any) {
  try {
    if (isAppActive() || Platform.OS === 'web') return;
    
    unreadCount += 1;
    const preview = msg.type === 'image' ? '📷 Imagen' : (msg.content || '').slice(0, 100);

    const Notifications = require('expo-notifications');

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('messages', {
        name: 'Mensajes',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        sound: 'default',
      }).catch(() => {});
    }

    Notifications.scheduleNotificationAsync({
      content: {
        title: 'Nuevo mensaje',
        body: preview,
        data: { conversationId: msg.conversationId },
        badge: unreadCount,
        sound: true,
      },
      trigger: null,
    }).catch(() => {});
  } catch {}
}

export function resetBadge() {
  unreadCount = 0;
  try {
    const Notifications = require('expo-notifications');
    Notifications.setBadgeCountAsync(0).catch(() => {});
  } catch {}
}
