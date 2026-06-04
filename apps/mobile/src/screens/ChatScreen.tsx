import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { getSocket } from '../socket';
import { Message } from '../types';

export default function ChatScreen({ route }: any) {
  const { conversationId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [editMode, setEditMode] = useState<{ id: string; content: string } | null>(null);
  const flatRef = useRef<FlatList>(null);
  const onNewMessage = useRef<((msg: Message) => void) | null>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadMessages();
    const socket = getSocket();
    socket.emit('join_room', conversationId);

    const handler = (msg: Message) => {
      setMessages((prev) => [msg, ...prev]);
    };
    onNewMessage.current = handler;
    socket.on('message:new', handler);

    return () => {
      socket.emit('leave_room', conversationId);
      if (onNewMessage.current) {
        socket.off('message:new', onNewMessage.current);
      }
    };
  }, [conversationId]);

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
    if (editMode) {
      handleEditSave(editMode.id, text.trim());
      return;
    }
    const tempId = Date.now().toString();
    const socket = getSocket();
    socket.emit('message:send', { tempId, conversationId, content: text.trim() });
    setText('');
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
          Alert.alert('Eliminar mensaje', '¿Seguro?', [
            { text: 'No', style: 'cancel' },
            {
              text: 'Sí, eliminar', style: 'destructive',
              onPress: async () => {
                try {
                  await api.del(`/conversations/${conversationId}/messages/${msg._id}`);
                  setMessages((prev) => prev.filter((m) => m._id !== msg._id));
                } catch (err) {
                  console.error(err);
                }
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

  const userId = user?.id || '';

  return (
    <View style={styles.wrapper}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m._id}
          inverted
          contentContainerStyle={{ paddingBottom: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onLongPress={() => handleLongPress(item)}
            >
              <View style={[styles.bubble, item.senderId === userId ? styles.mine : styles.other]}>
                <Text style={styles.msgText}>{item.content}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyText}>Sin mensajes aún</Text>
            </View>
          }
        />
        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          {editMode && (
            <TouchableOpacity onPress={cancelEdit} style={{ marginRight: 8 }}>
              <Text style={{ color: '#c62828', fontWeight: '600' }}>✕</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder={editMode ? 'Editando...' : 'Mensaje...'}
            placeholderTextColor="#999"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
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
  bubble: { maxWidth: '75%', padding: 10, borderRadius: 8, marginVertical: 2, marginHorizontal: 10 },
  mine: { backgroundColor: '#dcf8c6', alignSelf: 'flex-end' },
  other: { backgroundColor: '#fff', alignSelf: 'flex-start' },
  msgText: { fontSize: 16 },
  emptyChat: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 100 },
  emptyText: { fontSize: 16, color: '#999' },
  inputRow: { flexDirection: 'row', padding: 8, paddingBottom: 8, backgroundColor: '#f0f0f0', alignItems: 'center', borderTopWidth: 0.5, borderTopColor: '#ddd' },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, height: 40, fontSize: 16 },
  sendBtn: { marginLeft: 8, backgroundColor: '#075E54', borderRadius: 20, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
