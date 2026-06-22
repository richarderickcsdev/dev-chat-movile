import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';

export default function GroupListScreen({ navigation }: any) {
  const [groups, setGroups] = useState<any[]>([]);
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      loadGroups();
    }, []),
  );

  async function loadGroups() {
    try {
      const data = await api.get<{ groups: any[] }>('/groups');
      setGroups(data.groups || []);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateGroup')}>
        <Text style={styles.createBtnText}>+ Nuevo grupo</Text>
      </TouchableOpacity>
      <FlatList
        data={groups}
        keyExtractor={(item) => item._id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('GroupDetail', { groupId: item._id, groupName: item.name })}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.members}>{item.members.length} miembros</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIconWrap}>
              <Text style={styles.emptyIcon}>👥</Text>
            </View>
            <Text style={styles.emptyTitle}>No tienes grupos aún</Text>
            <Text style={styles.emptySubtext}>Toca el botón de arriba para crear tu primer grupo</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#efeae2' },
  createBtn: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 6,
    backgroundColor: '#075E54',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 1,
  },
  createBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  item: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#128C7E',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: { fontSize: 20, color: '#fff', fontWeight: '600' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '400', color: '#111b21' },
  members: { fontSize: 13, color: '#8696a0', marginTop: 2 },
  empty: { alignItems: 'center', marginTop: 100, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e7f0ea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  emptyIcon: { fontSize: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '500', color: '#3b4a54', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#8696a0', textAlign: 'center', lineHeight: 20 },
});
