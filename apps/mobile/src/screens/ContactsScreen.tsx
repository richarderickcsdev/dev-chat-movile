import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Image, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { api, BASE_URL } from '../api/client';

export default function ContactsScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    loadContacts();
  }, []);

  async function loadContacts() {
    try {
      const data = await api.get<{ contacts: any[] }>('/contacts');
      setContacts(data.contacts || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleSearch() {
    if (search.length < 3) return;
    setSearching(true);
    try {
      const data = await api.get<{ users: any[] }>(`/users/search?phone=${encodeURIComponent(search)}`);
      setSearchResults((data.users || []).filter((u) => u.id !== user?.id));
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  }

  async function addContact(phone: string) {
    try {
      await api.post('/contacts/sync', { phones: [phone] });
      await loadContacts();
      setSearchResults([]);
      setSearch('');
      Alert.alert('Contacto agregado');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function removeContact(id: string) {
    try {
      await api.del(`/contacts/${id}`);
      setContacts((prev) => prev.filter((c) => c.id !== id));
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function openChat(contactId: string, name: string, avatar: string) {
    try {
      const conv = await api.post<{ _id: string }>('/conversations', { participantId: contactId });
      navigation.navigate('Chat', {
        conversationId: conv._id,
        partnerName: name,
        partnerAvatar: avatar,
      });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo abrir el chat');
    }
  }

  function renderContact({ item }: any) {
    const avatarUrl = item.avatar_url ? (item.avatar_url.startsWith('http') ? item.avatar_url : `${BASE_URL}${item.avatar_url}`) : null;
    return (
      <TouchableOpacity style={styles.item} onPress={() => openChat(item.contact_id, item.name, item.avatar_url)} onLongPress={() => {
        Alert.alert('Eliminar contacto', `¿Eliminar a ${item.name}?`, [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Eliminar', style: 'destructive', onPress: () => removeContact(item.id) },
        ]);
      }}>
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  function renderSearchResult({ item }: any) {
    const isAlreadyContact = contacts.some((c) => c.contact_id === item.id);
    return (
      <View style={styles.searchItem}>
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{(item.name || item.phone || '?')[0].toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name || 'Sin nombre'}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
        {isAlreadyContact ? (
          <Text style={styles.addedText}>Agregado</Text>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => addContact(item.phone)}>
            <Text style={styles.addBtnText}>Agregar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por teléfono..."
          placeholderTextColor="#999"
          onSubmitEditing={handleSearch}
          returnKeyType="search"
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={search.length < 3}>
          <Text style={[styles.searchBtnText, search.length < 3 && { opacity: 0.5 }]}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {searchResults.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Resultados</Text>
          <FlatList data={searchResults} renderItem={renderSearchResult} keyExtractor={(item) => item.id} style={styles.searchList} />
        </>
      )}

      <Text style={styles.sectionTitle}>Contactos ({contacts.length})</Text>
      <FlatList
        data={contacts}
        renderItem={renderContact}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Busca usuarios por teléfono para agregarlos</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#efeae2' },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0ddd7',
  },
  searchInput: { flex: 1, backgroundColor: '#f0f2f5', borderRadius: 8, paddingHorizontal: 14, height: 38, fontSize: 15, color: '#111b21' },
  searchBtn: { marginLeft: 10, justifyContent: 'center' },
  searchBtnText: { color: '#075E54', fontWeight: '600', fontSize: 15 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#25D366',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: '#fff',
  },
  searchList: {
    maxHeight: 220,
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0ddd7',
    backgroundColor: '#fff',
  },
  item: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  searchItem: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fafafa',
  },
  avatarContainer: { marginRight: 14 },
  avatar: { width: 48, height: 48, borderRadius: 24 },
  avatarPlaceholder: { backgroundColor: '#075E54', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 20, color: '#fff', fontWeight: '600' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '400', color: '#111b21' },
  phone: { fontSize: 13, color: '#8696a0', marginTop: 2 },
  addBtn: {
    backgroundColor: '#25D366',
    borderRadius: 6,
    paddingHorizontal: 18,
    height: 34,
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  addedText: { color: '#8696a0', fontSize: 13, fontStyle: 'italic' },
  empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
  emptyText: { fontSize: 15, color: '#8696a0', textAlign: 'center' },
});
