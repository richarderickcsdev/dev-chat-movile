import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, Image, ActivityIndicator } from 'react-native';
import { api, BASE_URL } from '../api/client';

export default function CreateGroupScreen({ navigation }: any) {
  const [name, setName] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get<{ contacts: any[] }>('/contacts').then((data) => {
      setContacts(data.contacts || []);
    }).catch(() => {
      Alert.alert('Error', 'No se pudieron cargar los contactos');
    }).finally(() => {
      setLoading(false);
    });
  }, []);

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      return [...prev, id];
    });
  }

  async function handleCreate() {
    if (!name.trim()) {
      Alert.alert('Crear grupo', 'Ingresa un nombre para el grupo');
      return;
    }
    if (selected.length === 0) {
      Alert.alert('Crear grupo', 'Selecciona al menos un miembro tocando los contactos de la lista');
      return;
    }
    setCreating(true);
    try {
      await api.post('/groups', { name: name.trim(), memberIds: selected });
      Alert.alert('Grupo creado');
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo crear el grupo');
    } finally {
      setCreating(false);
    }
  }

  function renderItem({ item }: any) {
    const isSel = selected.includes(item.contact_id);
    const avatarUrl = item.avatar_url ? (item.avatar_url.startsWith('http') ? item.avatar_url : `${BASE_URL}${item.avatar_url}`) : null;
    return (
      <TouchableOpacity style={[styles.item, isSel && styles.itemSelected]} onPress={() => toggle(item.contact_id)}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarText}>{(item.name || '?')[0].toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.info}>
          <Text style={[styles.name, isSel && styles.nameSelected]}>{item.name}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
        <View style={[styles.checkbox, isSel && styles.checkboxSel]}>
          {isSel && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="Nombre del grupo"
        placeholderTextColor="#999"
        maxLength={100}
      />
      <Text style={styles.sectionTitle}>
        {loading ? 'Cargando contactos...' : `Selecciona miembros (${selected.length})`}
      </Text>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color="#075E54" />
          <Text style={styles.loadingText}>Cargando contactos...</Text>
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No tienes contactos</Text>
          <Text style={styles.emptySubtext}>
            Agrega contactos desde la pantalla de Contactos para crear un grupo
          </Text>
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderItem}
          keyExtractor={(item) => item.contact_id}
        />
      )}
      <TouchableOpacity
        style={styles.createBtn}
        onPress={handleCreate}
      >
        <Text style={styles.createBtnText}>
          {creating ? 'Creando...' : 'Crear grupo'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#efeae2' },
  input: { margin: 16, backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 16, height: 44, fontSize: 16, color: '#111b21' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#25D366', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#fff' },
  loadingWrap: { alignItems: 'center', paddingVertical: 40, backgroundColor: '#fff' },
  loadingText: { marginTop: 8, color: '#8696a0', fontSize: 14 },
  emptyWrap: { alignItems: 'center', paddingVertical: 60, paddingHorizontal: 40, backgroundColor: '#fff' },
  emptyTitle: { fontSize: 16, fontWeight: '500', color: '#3b4a54', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#8696a0', textAlign: 'center', lineHeight: 20 },
  item: { flexDirection: 'row', paddingHorizontal: 14, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: '#e0ddd7' },
  itemSelected: { backgroundColor: '#f0fdf4' },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 14 },
  avatarPlaceholder: { backgroundColor: '#075E54', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 18, color: '#fff', fontWeight: '600' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '400', color: '#111b21' },
  nameSelected: { fontWeight: '600', color: '#075E54' },
  phone: { fontSize: 13, color: '#8696a0', marginTop: 2 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#ccc', justifyContent: 'center', alignItems: 'center' },
  checkboxSel: { backgroundColor: '#25D366', borderColor: '#25D366' },
  checkmark: { color: '#fff', fontWeight: '700', fontSize: 14 },
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
});
