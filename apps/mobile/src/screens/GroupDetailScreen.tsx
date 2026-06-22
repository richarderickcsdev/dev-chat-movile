import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function GroupDetailScreen({ route, navigation }: any) {
  const { groupId } = route.params;
  const { user } = useAuth();
  const [group, setGroup] = useState<any>(null);
  const [addMode, setAddMode] = useState(false);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  async function loadGroup() {
    try {
      const data = await api.get<any>(`/groups/${groupId}`);
      setGroup(data);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSearch() {
    if (search.length < 3) return;
    try {
      const data = await api.get<{ users: any[] }>(`/users/search?phone=${encodeURIComponent(search)}`);
      setSearchResults((data.users || []).filter((u) => !group?.members.includes(u.id)));
    } catch (err) {
      console.error(err);
    }
  }

  async function addMember(userId: string) {
    try {
      await api.post(`/groups/${groupId}/members`, { memberIds: [userId] });
      await loadGroup();
      setSearch('');
      setSearchResults([]);
      setAddMode(false);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function removeMember(userId: string) {
    try {
      await api.del(`/groups/${groupId}/members/${userId}`);
      await loadGroup();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  if (!group) return <View style={styles.container}><Text style={styles.loading}>Cargando...</Text></View>;

  const isCreator = group.createdBy === user?.id;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarBig}><Text style={styles.avatarBigText}>{(group.name || 'G')[0].toUpperCase()}</Text></View>
        <Text style={styles.groupName}>{group.name}</Text>
        <Text style={styles.memberCount}>{group.members.length} miembros</Text>
      </View>

      {isCreator && (
        <TouchableOpacity style={styles.addBtn} onPress={() => setAddMode(!addMode)}>
          <Text style={styles.addBtnText}>{addMode ? 'Cancelar' : '+ Agregar miembros'}</Text>
        </TouchableOpacity>
      )}

      {addMode && (
        <View style={styles.addRow}>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar por teléfono..."
            placeholderTextColor="#999"
            onSubmitEditing={handleSearch}
          />
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.searchItem} onPress={() => addMember(item.id)}>
                <Text style={styles.searchName}>{item.name || 'Sin nombre'}</Text>
                <Text style={styles.addLabel}>Agregar</Text>
              </TouchableOpacity>
            )}
            style={{ maxHeight: 150 }}
          />
        </View>
      )}

      <Text style={styles.sectionTitle}>Miembros</Text>
      <FlatList
        data={group.members}
        keyExtractor={(item: string) => item}
        renderItem={({ item }) => (
          <View style={styles.memberItem}>
            <View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{(item === user?.id ? 'Tú' : item[0]).toUpperCase()}</Text></View>
            <Text style={styles.memberName}>{item === user?.id ? 'Tú' : item.slice(0, 8)}</Text>
            {item === group.createdBy && <Text style={styles.creatorBadge}>Creador</Text>}
            {isCreator && item !== user?.id && (
              <TouchableOpacity onPress={() => {
                Alert.alert('Eliminar miembro', '¿Seguro?', [
                  { text: 'Cancelar', style: 'cancel' },
                  { text: 'Eliminar', style: 'destructive', onPress: () => removeMember(item) },
                ]);
              }}>
                <Text style={styles.removeText}>Eliminar</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { textAlign: 'center', marginTop: 60, color: '#999', fontSize: 16 },
  header: { alignItems: 'center', paddingVertical: 24, borderBottomWidth: 0.5, borderBottomColor: '#ddd' },
  avatarBig: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#128C7E', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarBigText: { fontSize: 32, color: '#fff', fontWeight: '600' },
  groupName: { fontSize: 20, fontWeight: '600', color: '#1a1a1a' },
  memberCount: { fontSize: 14, color: '#999', marginTop: 4 },
  addBtn: { margin: 16, backgroundColor: '#075E54', borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  addRow: { paddingHorizontal: 16, paddingBottom: 12 },
  searchInput: { backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 16, height: 40, fontSize: 15 },
  searchItem: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  searchName: { fontSize: 15, color: '#1a1a1a' },
  addLabel: { color: '#25D366', fontWeight: '600' },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', textTransform: 'uppercase', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  memberItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center' },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#075E54', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  memberAvatarText: { fontSize: 16, color: '#fff', fontWeight: '600' },
  memberName: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  creatorBadge: { backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, fontSize: 11, color: '#2e7d32', marginRight: 8, overflow: 'hidden' },
  removeText: { color: '#c62828', fontSize: 13, fontWeight: '500' },
});
