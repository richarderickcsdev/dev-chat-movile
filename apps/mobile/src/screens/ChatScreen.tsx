import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Image, Modal, BackHandler, Keyboard } from 'react-native';
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

function statusColor(status: string): string {
  switch (status) {
    case 'read': return '#53bdeb';
    case 'delivered': return '#8696a0';
    case 'sent': return '#8696a0';
    case 'sending': return '#8696a0';
    default: return '#8696a0';
  }
}

function formatMsgTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
}

function formatDateSeparator(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);

  if (days === 0) return 'Hoy';
  if (days === 1) return 'Ayer';
  if (days < 7) return d.toLocaleDateString('es', { weekday: 'long' });
  return d.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
}

function isNewDay(prevIso: string, currIso: string): boolean {
  const a = new Date(prevIso);
  const b = new Date(currIso);
  return a.getDate() !== b.getDate() || a.getMonth() !== b.getMonth() || a.getFullYear() !== b.getFullYear();
}

export default function ChatScreen({ route, navigation }: any) {
  const { conversationId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [editMode, setEditMode] = useState<{ id: string; content: string } | null>(null);
  const [typingUser, setTypingUser] = useState('');
  const [fullscreenUri, setFullscreenUri] = useState<string | null>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

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

  const userId = user?.id || '';

  useLayoutEffect(() => {
    const { partnerName, partnerAvatar } = route.params;
    navigation.setOptions({
      headerTitle: '',
      headerLeft: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: -4 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 8, marginRight: 2 }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '600' }}>‹</Text>
          </TouchableOpacity>
          {partnerAvatar ? (
            <Image source={{ uri: partnerAvatar.startsWith('http') ? partnerAvatar : `${BASE_URL}${partnerAvatar}` }} style={{ width: 36, height: 36, borderRadius: 18, marginRight: 10 }} />
          ) : (
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 10 }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{(partnerName || '?')[0].toUpperCase()}</Text>
            </View>
          )}
          <View>
            <Text style={{ color: '#fff', fontSize: 17, fontWeight: '600' }}>{partnerName || 'Chat'}</Text>
            {typingUser ? <Text style={{ color: '#a5d6a7', fontSize: 12, marginTop: 1 }}>escribiendo...</Text> : null}
          </View>
        </View>
      ),
    });
  }, [navigation, route.params, typingUser]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
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
        return [msg, ...prev];
      });
      if (msg.senderId !== userId) {
        socket.emit('messages:delivered', { messageIds: [msg._id], conversationId });
        socket.emit('messages:read', { messageIds: [msg._id], conversationId });
      }
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

    const onEdited = (data: { messageId: string; content: string }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === data.messageId ? { ...m, content: data.content } : m)),
      );
    };

    const onDeleted = (data: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m._id !== data.messageId));
    };

    socket.on('message:new', onNewMsg);
    socket.on('message:ack', onAck);
    socket.on('messages:status', onStatus);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);
    socket.on('message:edited', onEdited);
    socket.on('message:deleted', onDeleted);

    return () => {
      socket.emit('leave_room', conversationId);
      socket.off('message:new', onNewMsg);
      socket.off('message:ack', onAck);
      socket.off('messages:status', onStatus);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
      socket.off('message:edited', onEdited);
      socket.off('message:deleted', onDeleted);
    };
  }, [conversationId, userId]);

  async function loadMessages(): Promise<Message[]> {
    try {
      const data = await api.get<{ messages: Message[] }>(`/conversations/${conversationId}/messages`);
      const sorted = (data.messages || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMessages(sorted);
      return sorted;
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
    if (socket) {
      socket.emit('message:send', { tempId, conversationId, content });
      socket.emit('typing:stop', conversationId);
    }
  }

  function handleTextChange(t: string) {
    setText(t);
    const socket = getSocket();
    if (!socket) return;
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
    const opts: { text: string; style?: any; onPress: () => void }[] = [
      { text: 'Cancelar', style: 'cancel', onPress: () => {} },
    ];
    if (msg.senderId === userId) {
      opts.push({
        text: 'Editar',
        onPress: () => {
          setEditMode({ id: msg._id, content: msg.content });
          setText(msg.content);
        },
      });
    }
    if (msg.senderId === userId) {
      opts.push({
        text: 'Eliminar', style: 'destructive',
        onPress: () => {
          Alert.alert('Eliminar', '¿Eliminar este mensaje?', [
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
      });
    }
    Alert.alert('Mensaje', undefined, opts);
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

  function handleScroll(evt: any) {
    const offset = evt.nativeEvent.contentOffset.y;
    setShowScrollDown(offset > 200);
  }

  function scrollToBottom() {
    flatRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  return (
    <View style={styles.wrapper}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m._id}
          inverted
          onScroll={handleScroll}
          scrollEventThrottle={100}
          contentContainerStyle={styles.listContent}
          renderItem={({ item, index }) => {
            const isMine = item.senderId === userId;
            const isImage = item.type === 'image' && item.imageUrl;
            const imgSrc = isImage ? (item.imageUrl!.startsWith('http') ? item.imageUrl : `${BASE_URL}${item.imageUrl}`) : '';
            const prevItem = index < messages.length - 1 ? messages[index + 1] : null;
            const showDate = !prevItem || isNewDay(prevItem.createdAt, item.createdAt);

            return (
              <View>
                {showDate && (
                  <View style={styles.dateSep}>
                    <Text style={styles.dateSepText}>{formatDateSeparator(item.createdAt)}</Text>
                  </View>
                )}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onLongPress={() => handleLongPress(item)}
                  onPress={isImage ? () => setFullscreenUri(imgSrc) : undefined}
                  style={[styles.bubbleWrap, isMine ? styles.bubbleWrapMine : styles.bubbleWrapOther]}
                >
                  <View style={[styles.bubble, isImage && styles.bubbleImage, isMine ? styles.mine : styles.other]}>
                    {isImage ? (
                      <View>
                        <Image source={{ uri: imgSrc }} style={styles.imageMsg} resizeMode="cover" />
                        <View style={styles.imageMeta}>
                          <Text style={styles.msgTime}>{formatMsgTime(item.createdAt)}</Text>
                          {isMine && (
                            <Text style={[styles.statusDot, { color: statusColor(item.status || 'sent') }]}>
                              {' '}{statusIcon(item.status || 'sent')}
                            </Text>
                          )}
                        </View>
                      </View>
                    ) : (
                      <View style={styles.msgRow}>
                        <Text style={styles.msgText}>{item.content}</Text>
                        <View style={styles.msgMeta}>
                          <Text style={styles.msgTime}>{formatMsgTime(item.createdAt)}</Text>
                          {isMine && (
                            <Text style={[styles.statusDot, { color: statusColor(item.status || 'sent') }]}>
                              {' '}{statusIcon(item.status || 'sent')}
                            </Text>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyIcon}>💬</Text>
              </View>
              <Text style={styles.emptyTitle}>Sin mensajes aún</Text>
              <Text style={styles.emptySubtext}>Envía un mensaje para iniciar la conversación</Text>
            </View>
          }
        />

        {typingUser && (
          <View style={styles.typingRow}>
            <Text style={styles.typingDot}>●</Text>
            <Text style={styles.typingDot}>●</Text>
            <Text style={styles.typingDot}>●</Text>
            <Text style={styles.typingText}>escribiendo...</Text>
          </View>
        )}

        {showScrollDown && (
          <TouchableOpacity style={styles.scrollDownBtn} onPress={scrollToBottom} activeOpacity={0.7}>
            <Text style={styles.scrollDownIcon}>⌄</Text>
          </TouchableOpacity>
        )}

        <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 6) }]}>
          {editMode && (
            <View style={styles.editBadge}>
              <Text style={styles.editBadgeText}>Editando</Text>
              <TouchableOpacity onPress={cancelEdit}>
                <Text style={styles.editCancel}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          {!editMode && (
            <TouchableOpacity onPress={handlePickImage} style={styles.attachBtn}>
              <Text style={styles.attachIcon}>📎</Text>
            </TouchableOpacity>
          )}
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={handleTextChange}
            placeholder={editMode ? 'Editando...' : 'Mensaje'}
            placeholderTextColor="#8696a0"
            onSubmitEditing={sendMessage}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!text.trim() && !editMode) && styles.sendBtnDisabled]}
            onPress={sendMessage}
            disabled={!text.trim() && !editMode}
          >
            <Text style={styles.sendIcon}>{editMode ? '✎' : '⌵'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={!!fullscreenUri} transparent animationType="fade" onRequestClose={() => setFullscreenUri(null)}>
        <View style={styles.fullscreenBg}>
          <TouchableOpacity style={styles.fullscreenClose} onPress={() => setFullscreenUri(null)}>
            <Text style={styles.fullscreenCloseText}>✕</Text>
          </TouchableOpacity>
          <Image source={{ uri: fullscreenUri || '' }} style={styles.fullscreenImage} resizeMode="contain" />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: '#efeae2' },
  container: { flex: 1 },
  listContent: { paddingVertical: 6 },

  dateSep: { alignItems: 'center', marginVertical: 8 },
  dateSepText: {
    fontSize: 12,
    color: '#54656f',
    backgroundColor: '#e6e1d8',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
  },

  bubbleWrap: { marginHorizontal: 12, marginVertical: 2 },
  bubbleWrapMine: { alignItems: 'flex-end' },
  bubbleWrapOther: { alignItems: 'flex-start' },
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    elevation: 1,
  },
  mine: {
    backgroundColor: '#d9fdd3',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  other: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },

  msgRow: {
    flexDirection: 'column',
  },
  msgText: { fontSize: 15, color: '#111b21', lineHeight: 20 },
  msgMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  msgTime: { fontSize: 11, color: '#667781' },
  statusDot: { fontSize: 11 },

  bubbleImage: { padding: 3, maxWidth: '72%' },
  imageMsg: { width: 200, height: 200, borderRadius: 6 },
  imageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
    paddingRight: 2,
  },

  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#efeae2',
  },
  typingDot: { fontSize: 8, color: '#075E54', marginRight: 2, opacity: 0.7 },
  typingText: { fontSize: 12, color: '#667781', marginLeft: 4, fontStyle: 'italic' },

  scrollDownBtn: {
    position: 'absolute',
    bottom: 64,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  scrollDownIcon: { fontSize: 22, color: '#54656f', fontWeight: '700' },

  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 120,
    paddingHorizontal: 40,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e7f0ea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '500', color: '#3b4a54', marginBottom: 6 },
  emptySubtext: { fontSize: 14, color: '#8696a0', textAlign: 'center' },

  inputRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: '#f0f2f5',
    alignItems: 'center',
    borderTopWidth: 0.5,
    borderTopColor: '#e0ddd7',
  },
  editBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#d9fdd3',
    borderRadius: 16,
    paddingHorizontal: 12,
    height: 34,
    marginRight: 6,
  },
  editBadgeText: { fontSize: 13, color: '#075E54', fontWeight: '500', marginRight: 8 },
  editCancel: { fontSize: 16, color: '#c62828', fontWeight: '600' },
  attachBtn: { marginRight: 6, width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  attachIcon: { fontSize: 20 },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 16,
    height: 40,
    fontSize: 16,
    color: '#111b21',
  },
  sendBtn: {
    marginLeft: 6,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#075E54',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: { opacity: 0.4 },
  sendIcon: { color: '#fff', fontSize: 22, fontWeight: '600' },

  fullscreenBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenCloseText: { color: '#fff', fontSize: 20, fontWeight: '600' },
  fullscreenImage: { width: '100%', height: '80%' },
});
