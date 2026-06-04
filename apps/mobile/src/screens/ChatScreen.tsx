import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
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
    loadMessages();
    const socket = getSocket();
    socket.emit('join_room', conversationId);
    loadMessages().then(() => {
      const unreadIds = messages
        .filter((m) => m.senderId !== userId && (m.status === 'sent' || m.status === 'delivered'))
        .map((m) => m._id);
      if (unreadIds.length > 0) {
        socket.emit('messages:read', { messageIds: unreadIds, conversationId });
      }
    });

    const onNewMsg = (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m._id === msg._id)) return prev;
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

  async function loadMessages() {
    try {
      const data = await api.get<{ messages: Message[] }>(`/conversations/${conversationId}/messages`);
      setMessages(data.messages);
    } catch (err) {
      console.error(err);
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
            return (
              <TouchableOpacity activeOpacity={0.8} onLongPress={() => handleLongPress(item)}>
                <View style={[styles.bubble, isMine ? styles.mine : styles.other]}>
                  <Text style={styles.msgText}>{item.content}</Text>
                  {isMine && (
                    <View style={styles.statusRow}>
                      <Text style={[styles.statusIcon, item.status === 'read' && styles.statusRead]}>
                        {statusIcon(item.status)}
                      </Text>
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
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleTextChange}
            placeholder={editMode ? 'Editando...' : 'Mensaje...'}
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={[styles.sendBtn, !text.trim() && styles.sendBtnDisabled]} onPress={sendMessage} disabled={!text.trim()}>
            <Text style={styles.sendText}>{editMode ? 'Editar' : 'Enviar'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  container: { flex: 1, backgroundColor: '#e5ddd5' },
  bubble: { maxWidth: '78%', padding: 8, paddingHorizontal: 10, borderRadius: 8, marginVertical: 2, marginHorizontal: 10 },
  mine: { backgroundColor: '#dcf8c6', alignSelf: 'flex-end', borderTopRightRadius: 2 },
  other: { backgroundColor: '#fff', alignSelf: 'flex-start', borderTopLeftRadius: 2 },
  msgText: { fontSize: 16, color: '#1a1a1a' },
  statusRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 2 },
  statusIcon: { fontSize: 13, color: '#8696a0', marginLeft: 2 },
  statusRead: { color: '#53bdeb' },
  typingText: { fontSize: 13, color: '#075E54', fontStyle: 'italic', paddingHorizontal: 16, paddingVertical: 4 },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 16, color: '#999' },
  inputRow: { flexDirection: 'row', padding: 8, backgroundColor: '#f0f0f0', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: '#ddd' },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, height: 40, fontSize: 16 },
  sendBtn: { marginLeft: 8, backgroundColor: '#075E54', borderRadius: 20, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
