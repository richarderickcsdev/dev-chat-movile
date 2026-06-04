import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { api } from '../api/client';
import { Conversation } from '../types';

export default function ChatsScreen({ navigation }: any) {
  const [conversations, setConversations] = useState<Conversation[]>([]);

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

  function renderItem({ item }: { item: Conversation }) {
    return (
      <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('Chat', { conversationId: item._id })}>
        <View style={styles.avatar} />
        <View style={styles.info}>
          <Text style={styles.name}>{item.participants.join(', ')}</Text>
          {item.lastMessage && <Text style={styles.lastMsg} numberOfLines={1}>{item.lastMessage.content}</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList data={conversations} renderItem={renderItem} keyExtractor={(item) => item._id} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  item: { flexDirection: 'row', padding: 16, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#ddd', marginRight: 12 },
  info: { flex: 1, justifyContent: 'center' },
  name: { fontSize: 16, fontWeight: '600' },
  lastMsg: { fontSize: 14, color: '#666', marginTop: 2 },
});
