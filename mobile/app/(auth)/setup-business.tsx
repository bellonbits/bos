// Shown when user is authenticated but has no business yet
// (edge case: registration completed but business step was skipped)
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '@stores/authStore';
import { BusinessAPI } from '@services/api';
import { dbRun } from '@db/database';
import { nowMs } from '@utils/helpers';
import { Colors, Spacing, FontSize, FontWeight, BorderRadius } from '@constants/theme';

export default function SetupBusinessScreen() {
  const { user, setActiveBusiness } = useAuthStore();
  const [name, setName] = useState('');
  const [type, setType] = useState('retail');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) { Alert.alert('Required', 'Business name is required.'); return; }
    setIsLoading(true);
    try {
      const { data } = await BusinessAPI.create({ name: name.trim(), business_type: type, location: location.trim() || undefined });
      await dbRun(
        `INSERT OR REPLACE INTO businesses (id, name, owner_id, business_type, subscription_tier, currency, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'free', 'KES', 1, ?, ?)`,
        [data.id, data.name, user!.id, type, nowMs(), nowMs()]
      );
      setActiveBusiness({ id: data.id, name: data.name, business_type: type, subscription_tier: 'free' });
      router.replace('/(app)');
    } catch {
      Alert.alert('Error', 'Failed to create business. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set up your business</Text>
      <Text style={styles.subtitle}>This takes 30 seconds.</Text>

      <View style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Business Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Mama Pima Shop" placeholderTextColor={Colors.textMuted} />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Location</Text>
          <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="e.g. Kibera, Nairobi" placeholderTextColor={Colors.textMuted} />
        </View>
        <TouchableOpacity style={[styles.btn, isLoading && { opacity: 0.7 }]} onPress={handleCreate} disabled={isLoading}>
          <Text style={styles.btnText}>{isLoading ? 'Creating...' : 'Start using Biashara OS'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', padding: Spacing.xl },
  title: { fontSize: FontSize.xxl, fontWeight: FontWeight.extrabold, color: Colors.text, marginBottom: 8 },
  subtitle: { fontSize: FontSize.base, color: Colors.textSecondary, marginBottom: Spacing.xl },
  form: { gap: Spacing.md },
  field: { gap: Spacing.xs },
  label: { fontSize: FontSize.sm, fontWeight: FontWeight.medium, color: Colors.textSecondary },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: BorderRadius.md,
    padding: Spacing.md, fontSize: FontSize.base, color: Colors.text, backgroundColor: Colors.surface,
  },
  btn: { backgroundColor: Colors.primary, borderRadius: BorderRadius.md, padding: Spacing.md, alignItems: 'center', marginTop: Spacing.md },
  btnText: { color: Colors.textInverse, fontSize: FontSize.md, fontWeight: FontWeight.bold },
});
