import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { useAuthStore } from '@stores/authStore';
import { getDatabase } from '@db/database';
import { SyncEngine } from '@sync/SyncEngine';
import { NetworkMonitor } from '@sync/NetworkMonitor';

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);

  useEffect(() => {
    async function boot() {
      // 1. Initialize SQLite (migrations run here)
      await getDatabase();
      // 2. Restore auth session
      await initialize();
      // 3. Start network monitoring + sync engine
      NetworkMonitor.start();
      await SyncEngine.start();
    }
    boot();

    return () => {
      NetworkMonitor.stop();
      SyncEngine.stop();
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" backgroundColor="#0F4C81" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
      <Toast />
    </GestureHandlerRootView>
  );
}
