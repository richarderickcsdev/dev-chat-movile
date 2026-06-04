import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { getSocket } from '../socket';
import * as Notifications from '../notifications';

export function useNotificationListener() {
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    let unread = 0;
    let socket: any = null;
    try { socket = getSocket(); } catch { return; }

    const handler = (msg: any) => {
      if (appStateRef.current !== 'active') {
        unread += 1;
        const preview = msg.type === 'image' ? '📷 Imagen' : (msg.content || '').slice(0, 100);
        Notifications.showMessageNotification(msg.conversationId, 'Nuevo mensaje', preview, unread);
      }
    };

    socket.on('message:new', handler);
    return () => { socket.off('message:new', handler); };
  }, []);
}
