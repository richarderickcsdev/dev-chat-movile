import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
} from 'react-native';

const RESEND_DELAY = 60;

export default function OTPScreen({ route, navigation, onVerified }: any) {
  const { phone } = route.params;
  const [codes, setCodes] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(RESEND_DELAY);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timer <= 0) { setCanResend(true); return; }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  const handleChange = useCallback((text: string, index: number) => {
    if (loading) return;
    const digit = text.replace(/[^0-9]/g, '');
    if (digit.length > 1) {
      const digits = digit.split('').slice(0, 6);
      setCodes(digits);
      inputRefs.current[Math.min(digits.length, 5)]?.focus();
      if (digits.every((d) => d !== '')) {
        handleVerify(digits.join(''));
      }
      return;
    }
    const newCodes = [...codes];
    newCodes[index] = digit;
    setCodes(newCodes);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }, [codes, loading]);

  const handleKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace' && !codes[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }, [codes]);

  async function handleVerify(code: string) {
    setLoading(true);
    try {
      await onVerified(phone, code);
    } catch (err: any) {
      Alert.alert('Código inválido', err.message);
      setCodes(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!canResend || loading) return;
    try {
      const res = await fetch('http://192.168.18.154:3001/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }
      setTimer(RESEND_DELAY);
      setCanResend(false);
      setCodes(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  const displayPhone = phone.startsWith('+') ? phone : `+${phone}`;

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>

      <Text style={styles.title}>Ingresa el código</Text>
      <Text style={styles.subtitle}>
        Enviamos un código SMS a{'\n'}
        <Text style={styles.phoneText}>{displayPhone}</Text>
      </Text>

      <View style={styles.codeRow}>
        {codes.map((digit, i) => (
          <TextInput
            key={i}
            ref={(ref) => { inputRefs.current[i] = ref as TextInput; }}
            style={[styles.codeBox, digit ? styles.codeBoxFilled : null]}
            keyboardType="number-pad"
            maxLength={1}
            value={digit}
            onChangeText={(t) => handleChange(t, i)}
            onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
            selectTextOnFocus
            editable={!loading}
          />
        ))}
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#075E54" />}

      <View style={styles.resendSection}>
        {canResend ? (
          <TouchableOpacity onPress={handleResend}>
            <Text style={styles.resendLink}>Reenviar código</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.timerText}>Reenviar en {timer}s</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingHorizontal: 24 },
  backBtn: { marginTop: 16, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 28, color: '#075E54' },
  title: { fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginTop: 24 },
  subtitle: { fontSize: 15, color: '#666', marginTop: 12, lineHeight: 22 },
  phoneText: { fontWeight: '600', color: '#1a1a1a' },
  codeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 40 },
  codeBox: { width: 48, height: 56, borderWidth: 2, borderColor: '#ddd', borderRadius: 12, textAlign: 'center', fontSize: 24, fontWeight: '700', color: '#1a1a1a', marginHorizontal: 4 },
  codeBoxFilled: { borderColor: '#075E54', backgroundColor: '#f0faf8' },
  resendSection: { alignItems: 'center', marginTop: 32 },
  resendLink: { fontSize: 16, color: '#075E54', fontWeight: '600' },
  timerText: { fontSize: 14, color: '#999' },
});
