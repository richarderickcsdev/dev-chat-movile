import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { getSocket } from '../socket';
import { Message } from '../types';

export default function ChatScreen({ route }: any) {
  const { conversationId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const flatRef = useRef<FlatList>(null);
  const onNewMessage = useRef<((msg: Message) => void) | null>(null);

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
    const tempId = Date.now().toString();
    const socket = getSocket();
    socket.emit('message:send', { tempId, conversationId, content: text.trim() });
    setText('');
  }

  const userId = user?.id || '';

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <FlatList
        ref={flatRef}
        data={messages}
        keyExtractor={(m) => m._id}
        inverted
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.senderId === userId ? styles.mine : styles.other]}>
            <Text style={styles.msgText}>{item.content}</Text>
          </View>
        )}
      />
      <View style={styles.inputRow}>
        <TextInput style={styles.input} value={text} onChangeText={setText} placeholder="Mensaje..." />
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#e5ddd5' },
  bubble: { maxWidth: '75%', padding: 10, borderRadius: 8, marginVertical: 2, marginHorizontal: 10 },
  mine: { backgroundColor: '#dcf8c6', alignSelf: 'flex-end' },
  other: { backgroundColor: '#fff', alignSelf: 'flex-start' },
  msgText: { fontSize: 16 },
  inputRow: { flexDirection: 'row', padding: 8, backgroundColor: '#f0f0f0', alignItems: 'center' },
  input: { flex: 1, backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 16, height: 40 },
  sendBtn: { marginLeft: 8, backgroundColor: '#075E54', borderRadius: 20, paddingHorizontal: 16, height: 40, justifyContent: 'center' },
  sendText: { color: '#fff', fontWeight: '600' },
});
