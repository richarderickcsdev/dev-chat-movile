import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import ChatsScreen from '../screens/ChatsScreen';
import ChatScreen from '../screens/ChatScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#075E54' }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#075E54' }, headerTintColor: '#fff' }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Chats" component={ChatsScreen} options={{ title: 'dev-chat' }} />
            <Stack.Screen name="Chat" component={ChatScreen} options={{ title: 'Chat' }} />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
