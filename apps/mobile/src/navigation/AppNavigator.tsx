import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { saveTokens, BASE_URL } from '../api/client';
import { connectSocket } from '../socket';
import WelcomeScreen from '../screens/WelcomeScreen';
import OTPScreen from '../screens/OTPScreen';
import ProfileSetupScreen from '../screens/ProfileSetupScreen';
import ChatsScreen from '../screens/ChatsScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isLoading, checkSession, setUser, isAuthenticated } = useAuth();
  const [flow, setFlow] = useState<'loading' | 'auth' | 'profile' | 'app'>('loading');

  useEffect(() => {
    checkSession().then(setFlow);
  }, [isAuthenticated]);

  const [pendingTokens, setPendingTokens] = useState<{ access: string; refresh: string } | null>(null);

  async function onVerified(phone: string, code: string) {
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
    connectSocket().catch((err) => console.warn('Socket connection failed:', err?.message));

    if (!me.name) {
      setPendingTokens({ access: data.accessToken, refresh: data.refreshToken });
      setFlow('profile');
    } else {
      setFlow('app');
    }
  }

  async function onProfileDone() {
    setFlow('app');
  }

  if (isLoading || flow === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#075E54' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <NavigationContainer key={flow}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {flow === 'auth' && (
          <>
            <Stack.Screen name="Welcome">
              {(props) => <WelcomeScreen {...props} />}
            </Stack.Screen>
            <Stack.Screen name="OTP">
              {(props) => <OTPScreen {...props} onVerified={onVerified} />}
            </Stack.Screen>
          </>
        )}
        {flow === 'profile' && (
          <Stack.Screen name="ProfileSetup">
            {(props) => <ProfileSetupScreen {...props} token={pendingTokens?.access || ''} onDone={onProfileDone} />}
          </Stack.Screen>
        )}
        {flow === 'app' && (
          <>
            <Stack.Screen name="Chats" component={ChatsScreen} options={{ headerShown: true, title: 'dev-chat', headerStyle: { backgroundColor: '#075E54' }, headerTintColor: '#fff' }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ headerShown: true, title: 'Chat', headerStyle: { backgroundColor: '#075E54' }, headerTintColor: '#fff' }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
