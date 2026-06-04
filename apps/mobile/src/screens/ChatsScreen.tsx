import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api, BASE_URL } from '../api/client';
import { getSocket } from '../socket';
import { Conversation } from '../types';

const ITEM_HEIGHT = 72;

function statusIcon(status?: string): string {
  switch (status) {
    case 'sending': return '◷';
    case 'sent': return '✓';
    case 'delivered': return '✓✓';
    case 'read': return '✓✓';
    default: return '';
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Ahora';
  if (mins < 60) return mins + ' min';
  if (hours < 24) return hours + ' h';
  if (days === 1) return 'Ayer';
  if (days < 7) return d.toLocaleDateString('es', { weekday: 'long' });
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' });
}

function getAvatarUrl(path: string): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path}`;
}

export default function ChatsScreen({ navigation, onLogout }: any) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const { user } = useAuth();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={{ marginLeft: 8 }}>
          {user?.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url.startsWith('http') ? user.avatar_url : `${BASE_URL}${user.avatar_url}` }}
              style={{ width: 32, height: 32, borderRadius: 16 }}
            />
          ) : (
            <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#25D366', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>{(user?.name || '?')[0].toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={{ paddingHorizontal: 12 }}>
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '500' }}>Salir</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, []),
  );

  useEffect(() => {
    let socket: any = null;
    try { socket = getSocket(); } catch {}
    if (socket) {
      const refresh = () => loadConversations();
      socket.on('message:new', refresh);
      socket.on('conversation:new', refresh);
      socket.on('messages:status', refresh);
      return () => {
        socket.off('message:new', refresh);
        socket.off('conversation:new', refresh);
        socket.off('messages:status', refresh);
      };
    }
  }, []);

  async function loadConversations() {
    try {
      const data = await api.get<{ conversations: Conversation[] }>('/conversations');
      setConversations(data.conversations || []);
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
      { text: 'Salir', style: 'destructive', onPress: onLogout },
    ]);
  }

  function handleDelete(convId: string, name: string) {
    Alert.alert('Eliminar chat', `¿Eliminar conversación con ${name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/conversations/${convId}`);
            setConversations((prev) => prev.filter((c) => c._id !== convId));
          } catch (err) {
            console.error(err);
          }
        },
      },
    ]);
  }

  const getItemLayout = useCallback(
    (_data: any, index: number) => ({ length: ITEM_HEIGHT, offset: ITEM_HEIGHT * index, index }),
    [],
  );

  function renderItem({ item }: { item: Conversation }) {
    const name = item.partner?.name || item.participants?.join(', ') || 'Chat';
    const avatarUrl = item.partner?.avatar_url ? getAvatarUrl(item.partner.avatar_url) : null;
    const timestamp = item.lastMessage?.createdAt || item.updatedAt;
    const isMine = item.lastMessage?.senderId === user?.id;

    return (
      <TouchableOpacity
        style={styles.item}
        activeOpacity={0.6}
        onPress={() => navigation.navigate('Chat', {
          conversationId: item._id,
          partnerName: item.partner?.name || 'Chat',
          partnerAvatar: item.partner?.avatar_url || null,
        })}
        onLongPress={() => handleDelete(item._id, name)}
      >
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{name[0]?.toUpperCase() || '?'}</Text>
            </View>
          )}
          {item.online && <View style={styles.onlineDot} />}
        </View>

        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={styles.name} numberOfLines={1}>{name}</Text>
            <Text style={styles.timestamp}>{formatTime(timestamp)}</Text>
          </View>
          <View style={styles.bottomRow}>
            {item.lastMessage ? (
              <Text style={styles.lastMsg} numberOfLines={1}>
                {isMine && 'Tú: '}
                {item.lastMessage.type === 'image' ? '📷 Imagen' : item.lastMessage.content}
                {isMine && item.lastMessage.status && (
                  <Text style={{ color: item.lastMessage.status === 'read' ? '#53bdeb' : '#8696a0', fontSize: 12 }}>
                    {' '}{statusIcon(item.lastMessage.status)}
                  </Text>
                )}
              </Text>
            ) : (
              <Text style={styles.noMsg}>Sin mensajes</Text>
            )}
          </View>
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
        getItemLayout={getItemLayout}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No hay conversaciones</Text>
            <Text style={styles.emptySubtext}>
              Para crear una, usa el REST Client{'\n'}
              POST /conversations
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  item: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', height: ITEM_HEIGHT },
  separator: { height: 0.5, backgroundColor: '#e8e8e8', marginLeft: 76 },
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  avatarPlaceholder: { backgroundColor: '#075E54', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, color: '#fff', fontWeight: '600' },
  onlineDot: { position: 'absolute', bottom: 2, right: 2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#25D366', borderWidth: 2, borderColor: '#fff' },
  info: { flex: 1, justifyContent: 'center' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 },
  name: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', flex: 1, marginRight: 8 },
  timestamp: { fontSize: 12, color: '#999' },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },
  lastMsg: { fontSize: 14, color: '#666', flex: 1 },
  noMsg: { fontSize: 14, color: '#bbb', fontStyle: 'italic' },
  empty: { alignItems: 'center', marginTop: 120 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999' },
  emptySubtext: { fontSize: 14, color: '#bbb', marginTop: 8, textAlign: 'center' },
});
