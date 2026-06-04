import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { BASE_URL } from '../api/client';

const RESEND_DELAY = 60;

export default function OTPScreen({ route, navigation, onVerified }: any) {
  const { phone } = route.params;
  const [codes, setCodes] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(RESEND_DELAY);
  const [canResend, setCanResend] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);
  const codesRef = useRef<string[]>(Array(6).fill(''));

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (timer <= 0) { setCanResend(true); return; }
    const id = setInterval(() => setTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [timer]);

  function updateCode(text: string, index: number) {
    if (loading) return;
    const digit = text.replace(/[^0-9]/g, '');

    if (digit.length > 1) {
      const digits = digit.split('').slice(0, 6);
      codesRef.current = digits;
      setCodes([...digits]);
      const nextEmpty = digits.findIndex((d) => !d);
      const focusIdx = nextEmpty === -1 ? 5 : nextEmpty;
      inputRefs.current[focusIdx]?.focus();
      if (digits.every((d) => d !== '')) {
        handleVerify(digits.join(''));
      }
      return;
    }

    const newCodes = [...codesRef.current];
    newCodes[index] = digit;
    codesRef.current = newCodes;
    setCodes(newCodes);
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !codesRef.current[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  async function handleVerify(code?: string) {
    const otp = code || codesRef.current.join('');
    if (otp.length !== 6) return;
    setLoading(true);
    try {
      await onVerified(phone, otp);
    } catch (err: any) {
      Alert.alert('Código inválido', err.message);
      codesRef.current = Array(6).fill('');
      setCodes(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!canResend || loading) return;
    try {
      const res = await fetch(`${BASE_URL}/auth/send-otp`, {
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
      codesRef.current = Array(6).fill('');
      setCodes(Array(6).fill(''));
      inputRefs.current[0]?.focus();
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

      <View style={styles.codeRow}>
        {codes.map((digit, i) => (
          <TextInput
            key={i}
            ref={(ref) => { inputRefs.current[i] = ref as TextInput; }}
            style={[styles.codeBox, digit ? styles.codeBoxFilled : null]}
            keyboardType={Platform.OS === 'web' ? 'default' : 'number-pad'}
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChangeText={(t) => {
              if (t === '') {
                if (i > 0 && !codesRef.current[i]) {
                  inputRefs.current[i - 1]?.focus();
                  return;
                }
              }
              updateCode(t, i);
            }}
            onSubmitEditing={() => {
              if (codesRef.current.every((d) => d !== '')) handleVerify();
            }}
            selectTextOnFocus
            editable={!loading}
          />
        ))}
      </View>

      <TouchableOpacity onPress={() => {
        codesRef.current = Array(6).fill('');
        setCodes(Array(6).fill(''));
        inputRefs.current[0]?.focus();
      }} style={{ alignItems: 'center', marginTop: 16 }}>
        <Text style={{ color: '#999', fontSize: 13 }}>Limpiar</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator style={{ marginTop: 24 }} size="large" color="#075E54" />}

      <TouchableOpacity
        style={[styles.verifyButton, (!allFilled || loading) && styles.verifyButtonDisabled]}
        onPress={() => handleVerify()}
        disabled={!allFilled || loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.verifyText}>Verificar</Text>
        )}
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
  codeRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 40, gap: 8 },
  codeBox: { width: 48, height: 56, borderWidth: 2, borderColor: '#ddd', borderRadius: 12, textAlign: 'center', fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  codeBoxFilled: { borderColor: '#075E54', backgroundColor: '#f0faf8' },
  verifyButton: { backgroundColor: '#075E54', borderRadius: 30, paddingVertical: 16, alignItems: 'center', marginTop: 32 },
  verifyButtonDisabled: { opacity: 0.5 },
  verifyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  resendSection: { alignItems: 'center', marginTop: 24 },
  resendLink: { fontSize: 16, color: '#075E54', fontWeight: '600' },
  timerText: { fontSize: 14, color: '#999' },
});
