import React, { useEffect, useState, useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { navigationRef } from './navRef';
import { useAuth } from '../context/AuthContext';
import { saveTokens, BASE_URL } from '../api/client';
import { connectSocket } from '../socket';
import { useNotificationListener } from '../notifications/useNotificationListener';
import WelcomeScreen from '../screens/WelcomeScreen';
import OTPScreen from '../screens/OTPScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import ChatsScreen from '../screens/ChatsScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isLoading, isAuthenticated, checkSession, setUser, logout } = useAuth();
  const [screen, setScreen] = useState<'loading' | 'auth' | 'profile' | 'app'>('loading');
  const [pendingToken, setPendingToken] = useState('');

  useNotificationListener();

  const goToLogout = useCallback(async () => {
    await logout();
    setScreen('auth');
  }, [logout]);

  const goToApp = useCallback(() => setScreen('app'), []);
  const goToProfile = useCallback(() => setScreen('profile'), []);
  const goToAuth = useCallback(() => setScreen('auth'), []);

  useEffect(() => {
    checkSession().then(setScreen);
  }, []);

  useEffect(() => {
    if (!isAuthenticated && screen === 'app') {
      goToLogout();
    }
  }, [isAuthenticated]);

  const onVerified = useCallback(async (phone: string, code: string) => {
    const res = await fetch(`${BASE_URL}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Código incorrecto');
    await saveTokens(data.accessToken, data.refreshToken);

    const meRes = await fetch(`${BASE_URL}/users/me`, {
      headers: { Authorization: `Bearer ${data.accessToken}` },
    });
    if (!meRes.ok) {
      const errBody = await meRes.json().catch(() => ({}));
      throw new Error(errBody.error || 'Error al obtener perfil');
    }
    const me = await meRes.json();
    setUser(me);
    await connectSocket(data.accessToken);

    if (!me.name) {
      setPendingToken(data.accessToken);
      goToProfile();
    } else {
      goToApp();
    }
  }, [setUser, goToProfile, goToApp]);

  const onProfileDone = useCallback(async () => {
    goToApp();
  }, [goToApp]);

  if (isLoading && screen === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#075E54' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {screen === 'auth' && (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="OTP">
              {(props) => <OTPScreen {...props} onVerified={onVerified} />}
            </Stack.Screen>
          </>
        )}
        {screen === 'profile' && (
          <Stack.Screen name="ProfileSetup">
            {(props) => <ProfileSetupScreen {...props} token={pendingToken} onDone={onProfileDone} onCancel={goToLogout} />}
          </Stack.Screen>
        )}
        {screen === 'app' && (
          <>
            <Stack.Screen name="Chats" options={{ headerShown: true, title: 'dev-chat', headerStyle: { backgroundColor: '#075E54' }, headerTintColor: '#fff' }}>
              {(props) => <ChatsScreen {...props} onLogout={goToLogout} />}
            </Stack.Screen>
            <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true, title: 'Chat', headerStyle: { backgroundColor: '#075E54' }, headerTintColor: '#fff' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
