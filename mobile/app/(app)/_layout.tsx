import { Redirect, Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@stores/authStore';
import { Colors, FontSize } from '@constants/theme';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, focused, label }: { name: IconName; focused: boolean; label: string }) {
  return (
    <View style={styles.tabIcon}>
      <Ionicons name={name} size={22} color={focused ? Colors.primary : Colors.textMuted} />
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>{label}</Text>
    </View>
  );
}

export default function AppLayout() {
  const { isAuthenticated, business } = useAuthStore();

  if (!isAuthenticated) return <Redirect href="/(auth)/login" />;
  if (!business) return <Redirect href="/(auth)/setup-business" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'grid' : 'grid-outline'} focused={focused} label="Home" />
          ),
        }}
      />
      <Tabs.Screen
        name="pos"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'cart' : 'cart-outline'} focused={focused} label="POS" />
          ),
        }}
      />
      <Tabs.Screen
        name="inventory"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name={focused ? 'cube' : 'cube-outline'} focused={focused} label="Stock" />
          ),
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? 'bar-chart' : 'bar-chart-outline'}
              focused={focused}
              label="Reports"
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.surface,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 64,
    paddingBottom: 8,
  },
  tabIcon: { alignItems: 'center', gap: 2, paddingTop: 4 },
  tabLabel: { fontSize: FontSize.xs, color: Colors.textMuted },
  tabLabelActive: { color: Colors.primary, fontWeight: '600' },
});
