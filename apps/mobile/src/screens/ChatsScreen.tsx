import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Conversation } from '../types';

export default function ChatsScreen({ navigation }: any) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user, logout } = useAuth();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={{ paddingHorizontal: 12 }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Salir</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useEffect(() => {
    loadConversations();
  }, []);

  async function loadConversations() {
    try {
      const data = await api.get<{ conversations: Conversation[] }>('/conversations');
      setConversations(data.conversations);
    } catch (err) {
      console.error(err);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadConversations();
    setRefreshing(false);
  }, []);

  function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: logout },
    ]);
  }

  function renderItem({ item }: { item: Conversation }) {
    const displayName = item.participants?.join(', ') || 'Chat';
    return (
      <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('Chat', { conversationId: item._id })}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName[0]?.toUpperCase() || '?'}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{displayName}</Text>
          {item.lastMessage && <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage.content}</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No hay conversaciones</Text>
            <Text style={styles.emptySubtext}>Usa el REST Client o Swagger para crear una</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  item: { flexDirection: 'row', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#ddd', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#075E54', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 20, color: '#fff', fontWeight: '600' },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  lastMsg: { fontSize: 14, color: '#666', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 80 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999' },
  emptySubtext: { fontSize: 14, color: '#bbb', marginTop: 8 },
});
