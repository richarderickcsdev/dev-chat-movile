import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import AppNavigator from './src/navigation/AppNavigator';
import * as NotificationService from './src/notifications';
import { navigationRef } from './src/navigation/navRef';

export default function App() {
  useEffect(() => {
    NotificationService.requestPermissions();

    NotificationService.setNotificationTapHandler((convId: string) => {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Chat', { conversationId: convId });
      }
    });

    const sub = NotificationService.addNotificationTapListener();
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <StatusBar style="light" />
        <AppNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
