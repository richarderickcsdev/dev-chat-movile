import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, Modal, Alert, ActivityIndicator, Keyboard,
} from 'react-native';

const COUNTRIES = [
  { code: '+1', flag: '🇺🇸', name: 'Estados Unidos' },
  { code: '+51', flag: '🇵🇪', name: 'Perú' },
  { code: '+52', flag: '🇲🇽', name: 'México' },
  { code: '+54', flag: '🇦🇷', name: 'Argentina' },
  { code: '+56', flag: '🇨🇱', name: 'Chile' },
  { code: '+57', flag: '🇨🇴', name: 'Colombia' },
  { code: '+58', flag: '🇻🇪', name: 'Venezuela' },
  { code: '+34', flag: '🇪🇸', name: 'España' },
  { code: '+1', flag: '🇨🇦', name: 'Canadá' },
  { code: '+55', flag: '🇧🇷', name: 'Brasil' },
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
  { code: '+1', flag: '🇩🇴', name: 'Rep. Dominicana' },
  { code: '+44', flag: '🇬🇧', name: 'Reino Unido' },
  { code: '+49', flag: '🇩🇪', name: 'Alemania' },
];

export default function WelcomeScreen({ navigation }: any) {
  const [selected, setSelected] = useState(COUNTRIES[1]);
  const [phone, setPhone] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const phoneRef = useRef<TextInput>(null);

  const fullPhone = `${selected.code}${phone}`;

  async function handleNext() {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) {
      Alert.alert('Error', 'Ingresa un número válido');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('http://192.168.18.154:3001/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al enviar código');
      }
      navigation.navigate('OTP', { phone: fullPhone });
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Text style={styles.logo}>dev-chat</Text>
        <Text style={styles.title}>Ingresa tu número</Text>
        <Text style={styles.subtitle}>
          Te enviaremos un código de verificación
        </Text>
      </View>

      <View style={styles.inputSection}>
        <TouchableOpacity style={styles.countrySelector} onPress={() => { Keyboard.dismiss(); setPickerOpen(true); }}>
          <Text style={styles.flag}>{selected.flag}</Text>
          <Text style={styles.countryCode}>{selected.code}</Text>
          <Text style={styles.chevron}>▼</Text>
        </TouchableOpacity>

        <TextInput
          ref={phoneRef}
          style={styles.phoneInput}
          placeholder="999 000 001"
          placeholderTextColor="#999"
          keyboardType="phone-pad"
          value={phone}
          onChangeText={(t) => setPhone(t.replace(/[^0-9]/g, ''))}
          maxLength={10}
        />
      </View>

      <TouchableOpacity
        style={[styles.nextButton, phone.replace(/\D/g, '').length < 7 && styles.nextButtonDisabled]}
        onPress={handleNext}
        disabled={loading || phone.replace(/\D/g, '').length < 7}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.nextText}>Siguiente</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.disclaimer}>
        Pueden aplicar cargos por mensajes de texto. Tu número solo se usará para la autenticación.
      </Text>

      <Modal visible={pickerOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecciona tu país</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Text style={styles.modalClose}>Cerrar</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={COUNTRIES}
              keyExtractor={(_, i) => i.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.countryItem, selected.code === item.code && selected.name === item.name && styles.countryItemActive]}
                  onPress={() => { setSelected(item); setPickerOpen(false); }}
                >
                  <Text style={styles.countryFlag}>{item.flag}</Text>
                  <Text style={[styles.countryName, selected.code === item.code && selected.name === item.name && styles.countryNameActive]}>
                    {item.name}
                  </Text>
                  <Text style={styles.countryCodeItem}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24 },
  topSection: { marginTop: 80, alignItems: 'center' },
  logo: { fontSize: 28, fontWeight: 'bold', color: '#075E54', marginBottom: 32 },
  title: { fontSize: 22, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 15, color: '#666', textAlign: 'center' },
  inputSection: { flexDirection: 'row', alignItems: 'center', marginTop: 40, borderBottomWidth: 2, borderBottomColor: '#075E54', paddingBottom: 8 },
  countrySelector: { flexDirection: 'row', alignItems: 'center', paddingRight: 12 },
  flag: { fontSize: 28, marginRight: 6 },
  countryCode: { fontSize: 18, fontWeight: '500', color: '#1a1a1a' },
  chevron: { fontSize: 12, color: '#075E54', marginLeft: 4, marginTop: 4 },
  phoneInput: { flex: 1, fontSize: 20, color: '#1a1a1a', paddingVertical: 0 },
  nextButton: { backgroundColor: '#075E54', borderRadius: 30, paddingVertical: 16, alignItems: 'center', marginTop: 48 },
  nextButtonDisabled: { opacity: 0.5 },
  nextText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  disclaimer: { fontSize: 12, color: '#999', textAlign: 'center', marginTop: 24, lineHeight: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  modalClose: { fontSize: 16, color: '#075E54', fontWeight: '500' },
  countryItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 0.5, borderBottomColor: '#f0f0f0' },
  countryItemActive: { backgroundColor: '#e8f5e9' },
  countryFlag: { fontSize: 24, marginRight: 14 },
  countryName: { flex: 1, fontSize: 16, color: '#333' },
  countryNameActive: { fontWeight: '600', color: '#075E54' },
  countryCodeItem: { fontSize: 16, color: '#999' },
});
