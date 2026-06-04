import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function LoginScreen() {
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const { sendOtp, verifyOtp } = useAuth();

  async function handleSendOtp() {
    if (phone.length < 10) {
      Alert.alert('Error', 'Ingresa un numero valido');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(phone);
      setStep('otp');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp() {
    if (code.length !== 6) {
      Alert.alert('Error', 'El codigo tiene 6 digitos');
      return;
    }
    setLoading(true);
    try {
      await verifyOtp(phone, code);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>dev-chat</Text>

      {step === 'phone' ? (
        <>
          <TextInput
            style={styles.input}
            placeholder="+51999000001"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
          <TouchableOpacity style={styles.button} onPress={handleSendOtp} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar codigo</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.subtitle}>Codigo enviado a {phone}</Text>
          <TextInput
            style={styles.input}
            placeholder="123456"
            placeholderTextColor="#999"
            keyboardType="number-pad"
            maxLength={6}
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity style={styles.button} onPress={handleVerifyOtp} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verificar</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#075E54' },
  title: { fontSize: 36, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 48 },
  subtitle: { color: '#fff', textAlign: 'center', marginBottom: 16, fontSize: 14 },
  input: { backgroundColor: '#fff', borderRadius: 8, padding: 16, fontSize: 18, marginBottom: 16, textAlign: 'center' },
  button: { backgroundColor: '#128C7E', borderRadius: 8, padding: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
});
