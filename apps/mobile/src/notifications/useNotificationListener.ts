import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { getSocket } from '../socket';
import * as Notifications from '../notifications';

export function useNotificationListener() {
  const appStateRef = useRef(AppState.currentState);
  const unreadRef = useRef(0);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
      if (nextState === 'active') {
        unreadRef.current = 0;
        Notifications.setBadgeCount(0);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      let socket: any;
      try { socket = getSocket(); } catch { return; }
      if (socket?.connected) {
        clearInterval(interval);
        socket.off('message:new');
        socket.on('message:new', (msg: any) => {
          if (appStateRef.current !== 'active') {
            unreadRef.current += 1;
            const preview = msg.type === 'image' ? '📷 Imagen' : (msg.content || '').slice(0, 100);
            Notifications.showMessageNotification(msg.conversationId, 'Nuevo mensaje', preview, unreadRef.current);
          }
        });
      }
    }, 500);
    return () => clearInterval(interval);
  }, []);
}
