import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image,
  StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api, BASE_URL } from '../api/client';
import { User } from '../types';

export default function EditProfileScreen({ navigation }: any) {
  const { user, setUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Error', 'Ingresa tu nombre');
      return;
    }
    setSaving(true);
    try {
      const res = await api.patch<User>('/users/me', { name: name.trim(), bio: bio.trim() || '' });
      setUser(res);
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  }

  async function pickAndUploadAvatar() {
    try {
      const { launchImageLibraryAsync, requestMediaLibraryPermissionsAsync } = require('expo-image-picker');
      const { status } = await requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permiso requerido'); return; }
      const result = await launchImageLibraryAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.7 });
      if (result.canceled || !result.assets?.[0]) return;

      setSaving(true);
      const uri = result.assets[0].uri;
      const formData = new FormData();
      formData.append('avatar', { uri, type: 'image/jpeg', name: 'avatar.jpg' } as any);

      const { getAccessToken } = require('../api/client');
      const token = await getAccessToken();
      const uploadRes = await fetch(`${BASE_URL}/users/me/avatar`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!uploadRes.ok) throw new Error('Error al subir avatar');

      const freshUser = await api.get<User>('/users/me');
      setUser(freshUser);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo subir la foto');
    } finally {
      setSaving(false);
    }
  }

  const avatarUrl = user?.avatar_url
    ? (user.avatar_url.startsWith('http') ? user.avatar_url : `${BASE_URL}${user.avatar_url}`)
    : null;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <TouchableOpacity style={styles.avatarCircle} onPress={pickAndUploadAvatar}>
        {avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={{ fontSize: 36, color: '#999' }}>{(user?.name || '?')[0].toUpperCase()}</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.avatarHint}>Toca para cambiar foto</Text>

      <Text style={styles.label}>Nombre</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} maxLength={100} />

      <Text style={styles.label}>Bio</Text>
      <TextInput style={[styles.input, styles.bioInput]} value={bio} onChangeText={setBio} maxLength={160} multiline />
      <Text style={styles.counter}>{bio.length}/160</Text>

      <TouchableOpacity style={[styles.saveBtn, (!name.trim() || saving) && styles.disabled]} onPress={handleSave} disabled={!name.trim() || saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar cambios</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 30, alignItems: 'center' },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, marginBottom: 8 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  avatarHint: { fontSize: 14, color: '#075E54', fontWeight: '500', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', alignSelf: 'flex-start', marginBottom: 6, marginTop: 8 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16, color: '#1a1a1a', backgroundColor: '#fafafa' },
  bioInput: { height: 80, textAlignVertical: 'top' },
  counter: { alignSelf: 'flex-end', fontSize: 12, color: '#999', marginTop: 4 },
  saveBtn: { width: '100%', backgroundColor: '#075E54', borderRadius: 30, paddingVertical: 16, alignItems: 'center', marginTop: 24 },
  disabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
