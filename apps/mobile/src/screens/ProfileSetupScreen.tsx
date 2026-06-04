import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  Image, StyleSheet, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { BASE_URL } from '../api/client';

export default function ProfileSetupScreen({ token, onDone }: any) {
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Error', 'Ingresa tu nombre');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${BASE_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), bio: bio.trim() || '' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Error al guardar perfil' }));
        throw new Error(err.error);
      }

      if (avatarUri) {
        const formData = new FormData();
        const filename = avatarUri.split('/').pop() || 'avatar.jpg';
        const ext = filename.split('.').pop()?.toLowerCase() || 'jpg';
        const mimeType = ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
        formData.append('avatar', { uri: avatarUri, type: mimeType, name: filename } as any);

        const uploadRes = await fetch(`${BASE_URL}/users/me/avatar`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => ({ error: 'Error al subir avatar' }));
          throw new Error(err.error);
        }
      }

      await onDone();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Ocurrió un error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    await onDone();
  }

  async function pickImage() {
    let status = null;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      status = perm.status;
    } catch {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería');
      return;
    }
    if (status !== 'granted') {
      Alert.alert('Permiso requerido', 'Necesitamos acceso a tu galería');
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'No se pudo abrir la galería');
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Tu perfil</Text>
      <Text style={styles.subtitle}>Cuéntanos sobre ti</Text>

      <TouchableOpacity style={styles.avatarCircle} onPress={pickImage}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.cameraIcon}>📷</Text>
          </View>
        )}
      </TouchableOpacity>
      <Text style={styles.avatarHint}>Agregar foto</Text>

      <Text style={styles.label}>Nombre</Text>
      <TextInput
        style={styles.input}
        placeholder="Tu nombre"
        placeholderTextColor="#999"
        value={name}
        onChangeText={setName}
        maxLength={100}
        autoFocus
      />

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.bioInput]}
        placeholder="¿Qué te gusta?"
        placeholderTextColor="#999"
        value={bio}
        onChangeText={setBio}
        maxLength={160}
        multiline
      />
      <Text style={styles.counter}>{bio.length}/160</Text>

      <TouchableOpacity
        style={[styles.saveButton, (!name.trim() || saving) && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={!name.trim() || saving}
      >
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>Guardar</Text>}
      </TouchableOpacity>

      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Omitir por ahora</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#fff', paddingHorizontal: 24, paddingTop: 60, alignItems: 'center' },
  title: { fontSize: 26, fontWeight: '700', color: '#1a1a1a' },
  subtitle: { fontSize: 15, color: '#666', marginTop: 8, marginBottom: 32 },
  avatarCircle: { width: 100, height: 100, borderRadius: 50, marginBottom: 8 },
  avatarImage: { width: 100, height: 100, borderRadius: 50 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e0e0e0', justifyContent: 'center', alignItems: 'center' },
  cameraIcon: { fontSize: 32 },
  avatarHint: { fontSize: 14, color: '#075E54', fontWeight: '500', marginBottom: 32 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', alignSelf: 'flex-start', marginBottom: 6, marginTop: 8 },
  input: { width: '100%', borderWidth: 1, borderColor: '#ddd', borderRadius: 10, padding: 14, fontSize: 16, color: '#1a1a1a', backgroundColor: '#fafafa' },
  bioInput: { height: 80, textAlignVertical: 'top', paddingTop: 14 },
  counter: { alignSelf: 'flex-end', fontSize: 12, color: '#999', marginTop: 4 },
  saveButton: { width: '100%', backgroundColor: '#075E54', borderRadius: 30, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  saveButtonDisabled: { opacity: 0.5 },
  saveText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  skipButton: { marginTop: 16, paddingVertical: 12 },
  skipText: { fontSize: 15, color: '#075E54', fontWeight: '500' },
});
