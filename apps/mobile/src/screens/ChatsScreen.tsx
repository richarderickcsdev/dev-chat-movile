import React, { useEffect, useState, useCallback, useLayoutEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { api, BASE_URL } from '../api/client';
import { getSocket } from '../socket';
import { Conversation } from '../types';

const TABS = ['Chats', 'Contactos', 'Grupos'] as const;
type Tab = (typeof TABS)[number];

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'Estados Unidos' },
  { code: '+51', flag: '🇵🇪', name: 'Perú' },
  { code: '+52', flag: '🇲🇽', name: 'México' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
  { code: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
  { code: '+34', flag: '🇪🇸', name: 'España' },
  { code: '+1', flag: '🇨🇦', name: 'Canadá' },
  { code: '+598', flag: '🇺🇾', name: 'Uruguay' },
  { code: '+595', flag: '🇵🇾', name: 'Paraguay' },
  { code: '+591', flag: '🇧🇴', name: 'Bolivia' },
  { code: '+593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '+507', flag: '🇵🇦', name: 'Panamá' },
  { code: '+506', flag: '🇨🇷', name: 'Costa Rica' },
  { code: '+503', flag: '🇸🇻', name: 'El Salvador' },
  { code: '+502', flag: '🇬🇹', name: 'Guatemala' },
  { code: '+504', flag: '🇭🇳', name: 'Honduras' },
  { code: '+505', flag: '🇳🇮', name: 'Nicaragua' },
  { code: '+53', flag: '🇨🇺', name: 'Cuba' },
  { code: '+44', flag: '🇬🇧', name: 'Reino Unido' },
  { code: '+49', flag: '🇩🇪', name: 'Alemania' },
];

function statusIcon(status?: string): { icon: string; color: string } {
  switch (status) {
    case 'sending': return { icon: '◷', color: '#8696a0' };
    case 'sent': return { icon: '✓', color: '#8696a0' };
    case 'delivered': return { icon: '✓✓', color: '#8696a0' };
    case 'read': return { icon: '✓✓', color: '#53bdeb' };
    default: return { icon: '', color: '#8696a0' };
  }
}

function formatTime(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Ahora';
  if (mins < 60) return mins + ' min';
  if (hours < 24) return hours + ' h';
  if (days === 1) return 'Ayer';
  if (days < 7) return d.toLocaleDateString('es', { weekday: 'long' });
  return d.toLocaleDateString('es', { day: '2-digit', month: '2-digit' });
}

function getAvatarUrl(path: string): string | null {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path}`;
}

export default function ChatsScreen({ navigation, onLogout }: any) {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('Chats');

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const [contacts, setContacts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [groups, setGroups] = useState<any[]>([]);

  const [addModal, setAddModal] = useState(false);
  const [addCountry, setAddCountry] = useState(COUNTRIES[1]);
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [addPhone, setAddPhone] = useState('');

  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editName, setEditName] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Xhats',
      headerTitleAlign: 'center',
      headerTitleStyle: { fontSize: 20, fontWeight: '600', color: '#fff' },
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} style={{ marginLeft: 12 }}>
          {user?.avatar_url ? (
            <Image
              source={{ uri: user.avatar_url.startsWith('http') ? user.avatar_url : `${BASE_URL}${user.avatar_url}` }}
              style={{ width: 36, height: 36, borderRadius: 18 }}
            />
          ) : (
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 16 }}>{(user?.name || '?')[0].toUpperCase()}</Text>
            </View>
          )}
        </TouchableOpacity>
      ),
      headerRight: () => (
        <TouchableOpacity onPress={handleLogout} style={{ paddingHorizontal: 12 }}>
          <Text style={{ color: '#ef4444', fontSize: 14, fontWeight: '600' }}>Salir</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      if (tab === 'Chats') loadConversations();
      else if (tab === 'Contactos') loadContacts();
      else if (tab === 'Grupos') loadGroups();
    }, [tab]),
  );

  useEffect(() => {
    let socket: any = null;
    try { socket = getSocket(); } catch {}
    if (socket) {
      const refresh = () => loadConversations();
      socket.on('message:new', refresh);
      socket.on('conversation:new', refresh);
      socket.on('messages:status', refresh);
      return () => {
        socket.off('message:new', refresh);
        socket.off('conversation:new', refresh);
        socket.off('messages:status', refresh);
      };
    }
  }, []);

  async function loadConversations() {
    try {
      const data = await api.get<{ conversations: Conversation[] }>('/conversations');
      setConversations(data.conversations || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadContacts() {
    try {
      const data = await api.get<{ contacts: any[] }>('/contacts');
      setContacts(data.contacts || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadGroups() {
    try {
      const data = await api.get<{ groups: any[] }>('/groups');
      setGroups(data.groups || []);
    } catch (err) {
      console.error(err);
    }
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (tab === 'Chats') await loadConversations();
    else if (tab === 'Contactos') await loadContacts();
    else if (tab === 'Grupos') await loadGroups();
    setRefreshing(false);
  }, [tab]);

  function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: onLogout },
    ]);
  }

  function handleDelete(convId: string, name: string) {
    Alert.alert('Eliminar chat', `¿Eliminar conversación con ${name}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await api.del(`/conversations/${convId}`);
            setConversations((prev) => prev.filter((c) => c._id !== convId));
          } catch (err) {
            console.error(err);
          }
        },
      },
    ]);
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

  async function handleAddContact() {
    const digits = addPhone.replace(/\D/g, '');
    if (digits.length < 7) {
      Alert.alert('Error', 'Ingresa un número de teléfono válido');
      return;
    }
    const fullPhone = `${addCountry.code}${digits}`;
    try {
      await api.post('/contacts/sync', { phones: [fullPhone] });
      setAddModal(false);
      setAddPhone('');
      await loadContacts();
      Alert.alert('Contacto agregado');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Usuario no encontrado');
    }
  }

  async function handleEditContact() {
    if (!editTarget || !editName.trim()) return;
    try {
      await api.patch(`/contacts/${editTarget.id}`, { name: editName.trim() });
      setEditTarget(null);
      setEditName('');
      await loadContacts();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo actualizar');
    }
  }

  function confirmDeleteContact(item: any) {
    Alert.alert('Eliminar contacto', `¿Eliminar a ${item.name} de tus contactos?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: () => removeContact(item.id),
      },
    ]);
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

  function renderConversation({ item }: { item: Conversation }) {
    const name = item.partner?.name || item.participants?.join(', ') || 'Chat';
    const avatarUrl = item.partner?.avatar_url ? getAvatarUrl(item.partner.avatar_url) : null;
    const timestamp = item.lastMessage?.createdAt || item.updatedAt;
    const isMine = item.lastMessage?.senderId === user?.id;
    const unread = item.unreadCount || 0;
    const st = item.lastMessage?.status ? statusIcon(item.lastMessage.status) : null;

    return (
      <TouchableOpacity
        style={styles.item}
        activeOpacity={0.6}
        onPress={() => navigation.navigate('Chat', {
          conversationId: item._id,
          partnerName: item.partner?.name || 'Chat',
          partnerAvatar: item.partner?.avatar_url || null,
        })}
        onLongPress={() => handleDelete(item._id, name)}
      >
        <View style={styles.avatarContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarText}>{name[0]?.toUpperCase() || '?'}</Text>
            </View>
          )}
          {item.online && <View style={styles.onlineDot} />}
        </View>
        <View style={styles.info}>
          <View style={styles.topRow}>
            <Text style={[styles.name, unread > 0 && styles.nameUnread]} numberOfLines={1}>{name}</Text>
            <Text style={styles.timestamp}>{formatTime(timestamp)}</Text>
          </View>
          <View style={styles.bottomRow}>
            <View style={styles.lastMsgContainer}>
              {item.lastMessage ? (
                <Text style={[styles.lastMsg, unread > 0 && styles.lastMsgUnread]} numberOfLines={1}>
                  {isMine && <Text style={styles.prefix}>Tú: </Text>}
                  {item.lastMessage.type === 'image' ? '📷 Imagen' : item.lastMessage.content}
                  {isMine && st && (
                    <Text style={{ color: st.color, fontSize: 11 }}>{' '}{st.icon}</Text>
                  )}
                </Text>
              ) : (
                <Text style={styles.noMsg}>Sin mensajes</Text>
              )}
            </View>
            {unread > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadText}>{unread > 99 ? '99+' : unread}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  function renderContact({ item }: any) {
    const avatarUrl = item.avatar_url ? (item.avatar_url.startsWith('http') ? item.avatar_url : `${BASE_URL}${item.avatar_url}`) : null;
    return (
      <View style={styles.contactRow}>
        <TouchableOpacity style={styles.contactMain} onPress={() => openChat(item.contact_id, item.name, item.avatar_url)} activeOpacity={0.6}>
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
        <View style={styles.contactActions}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setEditTarget(item); setEditName(item.name); }}>
            <Text style={styles.actionIcon}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => confirmDeleteContact(item)}>
            <Text style={[styles.actionIcon, { color: '#ef4444' }]}>✕</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  function renderSearchResult({ item }: any) {
    const isAlready = contacts.some((c) => c.contact_id === item.id);
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
        {isAlready ? (
          <Text style={styles.addedText}>Agregado</Text>
        ) : (
          <TouchableOpacity style={styles.addBtn} onPress={() => addContact(item.phone)}>
            <Text style={styles.addBtnText}>Agregar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  function renderGroup({ item }: any) {
    return (
      <TouchableOpacity style={styles.item} onPress={() => navigation.navigate('GroupDetail', { groupId: item._id, groupName: item.name })}>
        <View style={[styles.avatar, { backgroundColor: '#128C7E', justifyContent: 'center', alignItems: 'center', marginRight: 14 }]}>
          <Text style={styles.avatarText}>{(item.name || 'G')[0].toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.phone}>{item.members.length} miembros</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={styles.tab} onPress={() => setTab(t)} activeOpacity={0.7}>
            <Text style={[styles.tabText, tab === t && styles.tabActive]}>{t}</Text>
            {tab === t && <View style={styles.tabIndicator} />}
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'Chats' && (
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyIcon}>💬</Text>
              </View>
              <Text style={styles.emptyText}>No hay conversaciones</Text>
              <Text style={styles.emptySubtext}>Busca un contacto para empezar a chatear</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      {tab === 'Contactos' && (
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={styles.addContactBtn} onPress={() => setAddModal(true)}>
            <Text style={styles.addContactBtnIcon}>＋</Text>
            <Text style={styles.addContactBtnText}>Agregar contacto</Text>
          </TouchableOpacity>

          <View style={styles.searchRow}>
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Buscar por teléfono..."
              placeholderTextColor="#8696a0"
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={search.length < 3}>
              <Text style={[styles.searchBtnText, search.length < 3 && { opacity: 0.5 }]}>Buscar</Text>
            </TouchableOpacity>
          </View>
          {searching && <Text style={styles.searchingText}>Buscando...</Text>}
          {searchResults.length > 0 && (
            <View style={{ maxHeight: 220, borderBottomWidth: 0.5, borderBottomColor: '#e0ddd7' }}>
              <FlatList
                data={searchResults}
                renderItem={renderSearchResult}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
              />
            </View>
          )}
          <FlatList
            data={contacts}
            renderItem={renderContact}
            keyExtractor={(item) => item.id}
            refreshing={refreshing}
            onRefresh={onRefresh}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIconWrap}>
                  <Text style={styles.emptyIcon}>👤</Text>
                </View>
                <Text style={styles.emptyText}>No tienes contactos</Text>
                <Text style={styles.emptySubtext}>Busca usuarios o agrega por teléfono</Text>
              </View>
            }
            ItemSeparatorComponent={() => <View style={styles.separator} />}
          />
        </View>
      )}

      <Modal visible={addModal} transparent animationType="fade" onRequestClose={() => setAddModal(false)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Agregar contacto</Text>

            <TouchableOpacity style={styles.countrySelector} onPress={() => setCountryPickerOpen(true)}>
              <Text style={styles.countryFlag}>{addCountry.flag}</Text>
              <Text style={styles.countryCodeText}>{addCountry.code}</Text>
              <Text style={styles.chevron}>▼</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.phoneInputModal}
              value={addPhone}
              onChangeText={(t) => setAddPhone(t.replace(/[^0-9]/g, ''))}
              placeholder="999 000 001"
              placeholderTextColor="#8696a0"
              keyboardType="phone-pad"
              autoFocus
              maxLength={10}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => { setAddModal(false); setAddPhone(''); }}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleAddContact}>
                <Text style={styles.modalConfirmText}>Agregar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={countryPickerOpen} animationType="slide" transparent onRequestClose={() => setCountryPickerOpen(false)}>
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Selecciona país</Text>
              <TouchableOpacity onPress={() => setCountryPickerOpen(false)}>
                <Text style={styles.pickerClose}>Cerrar</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryItem, addCountry.code === item.code && addCountry.name === item.name && styles.countryItemActive]}
                  onPress={() => { setAddCountry(item); setCountryPickerOpen(false); }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={[styles.countryNameItem, addCountry.code === item.code && addCountry.name === item.name && styles.countryNameActive]}>
                    {item.name}
                  </Text>
                  <Text style={styles.countryCodeItem}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      <Modal visible={!!editTarget} transparent animationType="fade" onRequestClose={() => setEditTarget(null)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Editar nombre</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Nombre del contacto"
              placeholderTextColor="#8696a0"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditTarget(null)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleEditContact}>
                <Text style={styles.modalConfirmText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {tab === 'Grupos' && (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={(item) => item._id}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListHeaderComponent={
            <TouchableOpacity style={styles.createGroupBtn} onPress={() => navigation.navigate('CreateGroup')}>
              <Text style={styles.createGroupBtnText}>+ Nuevo grupo</Text>
            </TouchableOpacity>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Text style={styles.emptyIcon}>👥</Text>
              </View>
              <Text style={styles.emptyText}>No tienes grupos</Text>
              <Text style={styles.emptySubtext}>Crea un grupo para chatear con varios contactos</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#efeae2' },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#075E54',
    paddingBottom: 0,
    elevation: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  tabActive: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    width: 40,
    backgroundColor: '#fff',
    borderRadius: 1.5,
  },

  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0ddd7',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 38,
    fontSize: 15,
    color: '#111b21',
  },
  searchBtn: { marginLeft: 10, justifyContent: 'center' },
  searchBtnText: { color: '#075E54', fontWeight: '600', fontSize: 15 },

  searchItem: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fafafa',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e0ddd7',
  },
  addBtn: {
    backgroundColor: '#25D366',
    borderRadius: 6,
    paddingHorizontal: 18,
    height: 34,
    justifyContent: 'center',
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  addedText: { color: '#8696a0', fontSize: 13, fontStyle: 'italic' },

  createGroupBtn: {
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 6,
    backgroundColor: '#075E54',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    elevation: 1,
  },
  createGroupBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  item: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  separator: { height: 0.5, backgroundColor: '#e0ddd7', marginLeft: 76 },
  avatarContainer: { position: 'relative', marginRight: 14 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  avatarPlaceholder: { backgroundColor: '#075E54', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 24, color: '#fff', fontWeight: '600' },
  onlineDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#25D366',
    borderWidth: 3,
    borderColor: '#fff',
  },
  info: { flex: 1, justifyContent: 'center', height: 52 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  name: { fontSize: 17, fontWeight: '400', color: '#111b21', flex: 1, marginRight: 6 },
  nameUnread: { fontWeight: '600', color: '#111b21' },
  timestamp: { fontSize: 12, color: '#8696a0', marginTop: 2 },
  bottomRow: { flexDirection: 'row', alignItems: 'center' },
  lastMsgContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  lastMsg: { fontSize: 14, color: '#667781', flexShrink: 1 },
  lastMsgUnread: { fontWeight: '600', color: '#111b21' },
  prefix: { color: '#667781', fontWeight: '500' },
  noMsg: { fontSize: 14, color: '#8696a0', fontStyle: 'italic' },
  unreadBadge: {
    backgroundColor: '#25D366',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
    marginLeft: 6,
  },
  unreadText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  phone: { fontSize: 13, color: '#8696a0', marginTop: 2 },
  searchingText: { textAlign: 'center', color: '#8696a0', padding: 8, fontSize: 14 },

  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingRight: 8,
  },
  contactMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 14,
  },
  contactActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionIcon: { fontSize: 18, color: '#667781', fontWeight: '600' },

  addContactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 6,
    backgroundColor: '#075E54',
    borderRadius: 8,
    paddingVertical: 14,
    elevation: 1,
  },
  addContactBtnIcon: { fontSize: 18, color: '#fff', fontWeight: '700', marginRight: 8 },
  addContactBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modal: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    elevation: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#111b21', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 16,
    color: '#111b21',
    marginBottom: 20,
  },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12 },
  modalCancel: { paddingVertical: 10, paddingHorizontal: 16 },
  modalCancelText: { color: '#8696a0', fontSize: 15, fontWeight: '500' },
  modalConfirm: { backgroundColor: '#075E54', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 20 },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  countrySelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 12,
  },
  countryFlag: { fontSize: 22, marginRight: 8 },
  countryCodeText: { fontSize: 16, fontWeight: '500', color: '#111b21', flex: 1 },
  phoneInputModal: {
    backgroundColor: '#f0f2f5',
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 18,
    color: '#111b21',
    marginBottom: 20,
  },
  chevron: { fontSize: 12, color: '#075E54', marginTop: 2 },

  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  pickerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  pickerTitle: { fontSize: 18, fontWeight: '600', color: '#111b21' },
  pickerClose: { fontSize: 16, color: '#075E54', fontWeight: '500' },
  countryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  countryItemActive: { backgroundColor: '#e8f5e9' },
  countryNameItem: { flex: 1, fontSize: 16, color: '#333' },
  countryNameActive: { fontWeight: '600', color: '#075E54' },
  countryCodeItem: { fontSize: 16, color: '#8696a0' },

  empty: { alignItems: 'center', marginTop: 120, paddingHorizontal: 40 },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e7f0ea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  emptyIcon: { fontSize: 36 },
  emptyText: { fontSize: 20, fontWeight: '500', color: '#3b4a54', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: '#8696a0', textAlign: 'center', lineHeight: 20 },
});
