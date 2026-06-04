import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image, Modal, BackHandler } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { api, BASE_URL, getAccessToken } from '../api/client';
import { getSocket } from '../socket';
import { Message } from '../types';

const TYPING_DEBOUNCE = 2000;

function statusIcon(status: string): string {
  switch (status) {
    case 'sending': return '◷';
    case 'sent': return '✓';
    case 'delivered': return '✓✓';
    case 'read': return '✓✓';
    default: return '';
  }
}

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [editMode, setEditMode] = useState<{ id: string; content: string } | null>(null);
  const [typingUser, setTypingUser] = useState('');
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (fullscreenUri) {
        setFullscreenUri(null);
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [fullscreenUri]);
  const flatRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tempIdMap = useRef<Map<string, any>>(new Map());

  const userId = user?.id || '';

  useLayoutEffect(() => {
    navigation.setOptions({
      title: typingUser ? 'escribiendo...' : 'Chat',
    });
  }, [navigation, typingUser]);

  useEffect(() => {
    const socket = getSocket();
    socket.emit('join_room', conversationId);

    loadMessages().then((loaded) => {
      if (loaded && loaded.length > 0) {
        const unread = loaded
          .filter((m) => m.senderId !== userId && m.status !== 'read')
          .map((m) => m._id);
        if (unread.length > 0) {
          socket.emit('messages:read', { messageIds: unread, conversationId });
        }
      }
    });

    const onNewMsg = (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
        if (msg.senderId !== userId) {
          socket.emit('messages:delivered', { messageIds: [msg._id], conversationId });
          socket.emit('messages:read', { messageIds: [msg._id], conversationId });
        }
        return [msg, ...prev];
      });
    };

    const onAck = (ack: { tempId: string; messageId: string; status: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === ack.tempId ? { ...m, _id: ack.messageId, status: ack.status as any } : m)),
      );
    };

    const onStatus = (data: { messageIds: string[]; status: string }) => {
      setMessages((prev) =>
        prev.map((m) =>
          data.messageIds.includes(m._id) ? { ...m, status: data.status as any } : m,
        ),
      );
    };

    const onTypingStart = (data: { userId: string; conversationId: string }) => {
      if (data.userId !== userId) setTypingUser(data.userId);
    };

    const onTypingStop = (data: { userId: string; conversationId: string }) => {
      if (data.userId !== userId) setTypingUser('');
    };

    socket.on('message:new', onNewMsg);
    socket.on('message:ack', onAck);
    socket.on('messages:status', onStatus);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);

    return () => {
      socket.emit('leave_room', conversationId);
      socket.off('message:new', onNewMsg);
      socket.off('message:ack', onAck);
      socket.off('messages:status', onStatus);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
    };
  }, [conversationId, userId]);

  async function loadMessages(): Promise<Message[]> {
    try {
      const data = await api.get<{ messages: Message[] }>(`/conversations/${conversationId}/messages`);
      setMessages(data.messages);
      return data.messages;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  function sendMessage() {
    if (!text.trim()) return;
    const content = text.trim();

    if (editMode) {
      handleEditSave(editMode.id, content);
      return;
    }

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: Message = {
      _id: tempId,
      conversationId,
      senderId: userId,
      content,
      status: 'sending',
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [optimisticMsg, ...prev]);
    setText('');

    const socket = getSocket();
    socket.emit('message:send', { tempId, conversationId, content });
    socket.emit('typing:stop', conversationId);
  }

  function handleTextChange(t: string) {
    setText(t);
    const socket = getSocket();
    socket.emit('typing:start', conversationId);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socket.emit('typing:stop', conversationId);
    }, TYPING_DEBOUNCE);
  }

  async function handleEditSave(msgId: string, content: string) {
    try {
      await api.patch(`/conversations/${conversationId}/messages/${msgId}`, { content });
      setMessages((prev) => prev.map((m) => (m._id === msgId ? { ...m, content } : m)));
    } catch (err) {
      console.error(err);
    } finally {
      setEditMode(null);
      setText('');
    }
  }

  function handleLongPress(msg: Message) {
    if (msg.senderId !== userId) return;
    Alert.alert('Mensaje', '¿Qué quieres hacer?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Editar',
        onPress: () => {
          setEditMode({ id: msg._id, content: msg.content });
          setText(msg.content);
        },
      },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: () => {
          Alert.alert('Eliminar', '¿Seguro?', [
            { text: 'No', style: 'cancel' },
            {
              text: 'Sí', style: 'destructive',
              onPress: async () => {
                try {
                  await api.del(`/conversations/${conversationId}/messages/${msg._id}`);
                  setMessages((prev) => prev.filter((m) => m._id !== msg._id));
                } catch (err) { console.error(err); }
              },
            },
          ]);
        },
      },
    ]);
  }

  async function handlePickImage() {
    try {
      const { launchImageLibraryAsync, requestMediaLibraryPermissionsAsync } = require('expo-image-picker');
      const { status } = await requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería');
        return;
      }
      const result = await launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const uri = result.assets[0].uri;
      const formData = new FormData();
      const filename = uri.split('/').pop() || 'image.jpg';
      formData.append('image', { uri, type: 'image/jpeg', name: filename } as any);

      const token = await getAccessToken();
      const uploadRes = await fetch(`${BASE_URL}/conversations/${conversationId}/images`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!uploadRes.ok) {
        const err = await uploadRes.json().catch(() => ({}));
        throw new Error(err.error || 'Error al subir imagen');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo enviar la imagen');
    }
  }

  function cancelEdit() {
    setEditMode(null);
    setText('');
  }

  return (
    <View style={styles.wrapper}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m._id}
          inverted
          contentContainerStyle={{ paddingBottom: 8 }}
          renderItem={({ item }) => {
            const isMine = item.senderId === userId;
            const isImage = item.type === 'image' && item.imageUrl;
            const imgSrc = isImage ? (item.imageUrl!.startsWith('http') ? item.imageUrl : `${BASE_URL}${item.imageUrl}`) : '';
            return (
              <TouchableOpacity activeOpacity={0.8} onLongPress={() => handleLongPress(item)} onPress={isImage ? () => setFullscreenUri(imgSrc) : undefined}>
                <View style={[styles.bubble, isImage && styles.bubbleImage, isMine ? styles.mine : styles.other]}>
                  {isImage ? (
                    <View>
                      <Image source={{ uri: imgSrc }} style={styles.imageMsg} resizeMode="cover" />
                      {isMine && (
                        <View style={styles.imageStatusRow}>
                          <Text style={[styles.statusIcon, item.status === 'read' && styles.statusRead]}>
                            {statusIcon(item.status)}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.msgRow}>
                      <Text style={styles.msgText}>{item.content}</Text>
                      {isMine && (
                        <Text style={[styles.statusIcon, item.status === 'read' && styles.statusRead]}>
                          {' '}{statusIcon(item.status)}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyText}>Sin mensajes aún</Text>
            </View>
          }
        />
        {typingUser ? (
          <Text style={styles.typingText}>escribiendo...</Text>
        ) : null}
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {editMode && (
            <TouchableOpacity onPress={cancelEdit} style={{ marginRight: 8 }}>
              <Text style={{ color: '#c62828', fontWeight: '600', fontSize: 18 }}>✕</Text>
            </TouchableOpacity>
          )}
          {!editMode && (
            <TouchableOpacity onPress={handlePickImage} style={{ marginRight: 6 }}>
              <Text style={{ fontSize: 22 }}>📎</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleTextChange}
            placeholder={editMode ? 'Editando...' : 'Mensaje...'}
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={[styles.sendBtn, !text.trim() && !editMode ? styles.sendBtnDisabled : null]} onPress={sendMessage} disabled={!text.trim() && !editMode}>
            <Text style={styles.sendText}>{editMode ? 'Editar' : 'Enviar'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={!!fullscreenUri} transparent animationType="fade">
        <TouchableOpacity style={styles.fullscreenBg} activeOpacity={1} onPress={() => setFullscreenUri(null)}>
          <Image source={{ uri: fullscreenUri || '' }} style={styles.fullscreenImage} resizeMode="contain" />
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: '#e5ddd5' },
  bubble: { maxWidth: '78%', padding: 8, paddingHorizontal: 10, borderRadius: 8, marginVertical: 2, marginHorizontal: 10 },
  mine: { backgroundColor: '#dcf8c6', alignSelf: 'flex-end', borderTopRightRadius: 2 },
  other: { backgroundColor: '#fff', alignSelf: 'flex-start', borderTopLeftRadius: 2 },
  msgText: { fontSize: 16, color: '#1a1a1a', flexShrink: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end' },
  statusIcon: { fontSize: 12, color: '#8696a0', marginLeft: 4 },
  statusRead: { color: '#53bdeb' },
  typingText: { fontSize: 13, color: '#075E54', fontStyle: 'italic', paddingHorizontal: 16, paddingVertical: 4 },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 16, color: '#999' },
  inputRow: { flexDirection: 'row', padding: 8, backgroundColor: '#f0f0f0', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: '#ddd' },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, height: 40, fontSize: 16 },
  sendBtn: { marginLeft: 8, backgroundColor: '#075E54', borderRadius: 20, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  bubbleImage: { padding: 3, maxWidth: '70%' },
  imageMsg: { width: 200, height: 200, borderRadius: 6 },
  imageStatusRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 3, paddingRight: 2 },
  fullscreenBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  fullscreenImage: { width: '100%', height: '80%' },
});
