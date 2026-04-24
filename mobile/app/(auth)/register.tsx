import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Link, router } from 'expo-router';
import { useAuthStore } from '@stores/authStore';
import { BusinessAPI } from '@services/api';
import { dbRun } from '@db/database';
import { generateId, nowMs } from '@utils/helpers';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@constants/theme';

type Step = 'account' | 'business';

export default function RegisterScreen() {
  const [step, setStep] = useState<Step>('account');
  const [form, setForm] = useState({
    name: '', email: '', password: '', phone: '',
    businessName: '', businessType: 'retail', location: '',
  });
  const { register, isLoading, error, user, setActiveBusiness, clearError } = useAuthStore();

  function set(field: string, value: string) {
    clearError();
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleAccountNext() {
    if (!form.name.trim() || !form.email.trim() || form.password.length < 6) {
      Alert.alert('Validation', 'Name, email, and a 6+ character password are required.');
      return;
    }
    await register({ email: form.email.trim().toLowerCase(), password: form.password, name: form.name.trim(), phone: form.phone.trim() || undefined });
    if (!error) setStep('business');
  }

  async function handleBusinessCreate() {
    if (!form.businessName.trim()) {
      Alert.alert('Required', 'Please enter your business name.');
      return;
    }
    try {
      const { data } = await BusinessAPI.create({
        name: form.businessName.trim(),
        business_type: form.businessType,
        location: form.location.trim() || undefined,
      });

      // Cache locally
      await dbRun(
        `INSERT OR REPLACE INTO businesses (id, name, owner_id, business_type, subscription_tier, currency, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [data.id, data.name, user!.id, data.business_type, 'free', 'KES', nowMs(), nowMs()]
      );

      setActiveBusiness({ id: data.id, name: data.name, business_type: data.business_type, subscription_tier: 'free' });
      router.replace('/(app)');
    } catch {
      Alert.alert('Error', 'Failed to create business. You can set it up later.');
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>B</Text>
          </View>
          <Text style={styles.title}>Get started</Text>
          <Text style={styles.subtitle}>
            {step === 'account' ? 'Step 1 of 2 — Create account' : 'Step 2 of 2 — Your business'}
          </Text>
        </View>

        <View style={styles.form}>
          {step === 'account' ? (
            <>
              {error ? <View style={styles.errorBanner}><Text style={styles.errorText}>{error}</Text></View> : null}
              <Field label="Full Name" value={form.name} onChangeText={(v) => set('name', v)} placeholder="Jane Wanjiku" />
              <Field label="Email" value={form.email} onChangeText={(v) => set('email', v)} placeholder="jane@example.co.ke" keyboard="email-address" />
              <Field label="Phone (optional)" value={form.phone} onChangeText={(v) => set('phone', v)} placeholder="0712 345 678" keyboard="phone-pad" />
              <Field label="Password" value={form.password} onChangeText={(v) => set('password', v)} placeholder="At least 6 characters" secure />

              <TouchableOpacity style={[styles.btn, isLoading && styles.btnDisabled]} onPress={handleAccountNext} disabled={isLoading}>
                {isLoading ? <ActivityIndicator color={Colors.textInverse} /> : <Text style={styles.btnText}>Continue</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.stepHint}>Tell us about your business so we can customise Biashara OS for you.</Text>
              <Field label="Business Name *" value={form.businessName} onChangeText={(v) => set('businessName', v)} placeholder="e.g. Wanjiku Enterprises" />
              <Field label="Location" value={form.location} onChangeText={(v) => set('location', v)} placeholder="e.g. Westlands, Nairobi" />

              <View style={styles.field}>
                <Text style={styles.label}>Business Type</Text>
                <View style={styles.typeRow}>
                  {[
                    { val: 'retail', label: 'Duka / Shop' },
                    { val: 'salon', label: 'Salon' },
                    { val: 'restaurant', label: 'Restaurant' },
                  ].map((t) => (
                    <TouchableOpacity
                      key={t.val}
                      style={[styles.typeChip, form.businessType === t.val && styles.typeChipActive]}
                      onPress={() => set('businessType', t.val)}
                    >
                      <Text style={[styles.typeChipText, form.businessType === t.val && styles.typeChipTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity style={styles.btn} onPress={handleBusinessCreate}>
                <Text style={styles.btnText}>Create Business & Start</Text>
              </TouchableOpacity>
            </>
          )}

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" asChild>
              <TouchableOpacity><Text style={styles.link}>Sign in</Text></TouchableOpacity>
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, value, onChangeText, placeholder, keyboard, secure }: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder?: string; keyboard?: 'email-address' | 'phone-pad'; secure?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboard ?? 'default'}
        autoCapitalize={keyboard === 'email-address' ? 'none' : 'words'}
        secureTextEntry={secure}
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  header: { alignItems: 'center', marginBottom: Spacing.xl },
  logoCircle: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.accent,
    justifyContent: 'center', alignItems: 'center', marginBottom: Spacing.md,
  },
  logoText: { fontSize: 32, fontWeight: FontWeight.extrabold, color: Colors.primary },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.textInverse },
  subtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  form: { backgroundColor: Colors.surface, borderRadius: BorderRadius.xl, padding: Spacing.xl, gap: Spacing.md },
  stepHint: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  errorBanner: { backgroundColor: Colors.dangerLight, borderRadius: BorderRadius.sm, padding: Spacing.sm },
  errorText: { color: Colors.danger, fontSize: FontSize.sm },
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: FontSize.base, color: Colors.text, backgroundColor: Colors.background,
  },
  typeRow: { flexDirection: 'row', gap: Spacing.sm, flexWrap: 'wrap' },
  typeChip: {
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full,
    borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.background,
  },
  typeChipActive: { borderColor: Colors.primary, backgroundColor: Colors.infoLight },
  typeChipText: { fontSize: FontSize.sm, color: Colors.textSecondary },
  typeChipTextActive: { color: Colors.primary, fontWeight: FontWeight.semibold },
  btn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.xs },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: Colors.textInverse, fontSize: FontSize.md, fontWeight: FontWeight.bold },
  footer: { flexDirection: 'row', justifyContent: 'center' },
  footerText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  link: { color: Colors.primary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
});
