import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';

const RESEND_DELAY = 60;

export default function OTPScreen({ route, navigation, onVerified }: any) {
  const { phone } = route.params;
  const [codes, setCodes] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(RESEND_DELAY);
  const [canResend, setCanResend] = useState(false);
  const hiddenRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => hiddenRef.current?.focus(), 300);
  }, []);

  useEffect(() => {
    if (timer <= 0) { setCanResend(true); return; }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  function handleChange(text: string) {
    if (loading) return;
    const digits = text.replace(/[^0-9]/g, '');
    const arr = digits.split('').slice(0, 6);
    while (arr.length < 6) arr.push('');
    setCodes(arr);
    if (digits.length >= 6) {
      handleVerify(digits.slice(0, 6));
    }
  }

  function focusInput() {
    hiddenRef.current?.focus();
  }

  async function handleVerify(code: string) {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      await onVerified(phone, code);
    } catch (err: any) {
      Alert.alert('Código inválido', err.message);
      setCodes(Array(6).fill(''));
      hiddenRef.current?.focus();
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
      hiddenRef.current?.focus();
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  const allFilled = codes.every((d) => d !== '');
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

      <TouchableOpacity style={styles.codeRow} onPress={focusInput} activeOpacity={1}>
        {codes.map((digit, i) => (
          <View key={i} style={[styles.codeBox, digit ? styles.codeBoxFilled : null, i === 0 && codes.every(d => !d) && styles.codeBoxActive]}>
            <Text style={styles.codeText}>{digit}</Text>
          </View>
        ))}
      </TouchableOpacity>

      <TextInput
        ref={hiddenRef}
        style={styles.hiddenInput}
        keyboardType={Platform.OS === 'web' ? 'default' : 'number-pad'}
        inputMode="numeric"
        maxLength={6}
        value={codes.filter(d => d).join('')}
        onChangeText={handleChange}
        autoFocus
        selectTextOnFocus
        caretHidden
      />

      {loading && <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#075E54" />}

      <TouchableOpacity
        style={[styles.verifyButton, (!allFilled || loading) && styles.verifyButtonDisabled]}
        onPress={() => handleVerify(codes.filter(d => d).join(''))}
        disabled={!allFilled || loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.verifyText}>Verificar</Text>}
      </TouchableOpacity>

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
  codeRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 40, gap: 10 },
  codeBox: { width: 48, height: 56, borderWidth: 2, borderColor: '#ddd', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  codeBoxFilled: { borderColor: '#075E54', backgroundColor: '#f0faf8' },
  codeBoxActive: { borderColor: '#075E54' },
  codeText: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  hiddenInput: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  verifyButton: { backgroundColor: '#075E54', borderRadius: 30, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  verifyButtonDisabled: { opacity: 0.5 },
  verifyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  resendSection: { alignItems: 'center', marginTop: 24 },
  resendLink: { fontSize: 16, color: '#075E54', fontWeight: '600' },
  timerText: { fontSize: 14, color: '#999' },
});
