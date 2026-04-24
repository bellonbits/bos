import { useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, RefreshControl,
  TouchableOpacity, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useDashboardStore } from '@stores/dashboardStore';
import { useAuthStore } from '@stores/authStore';
import { SyncEngine } from '@sync/SyncEngine';
import {
  Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow,
} from '@constants/theme';
import { formatKES, formatPercent, formatTime } from '@utils/helpers';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  const { business, user } = useAuthStore();
  const { summary, insights, lowStockCount, pendingSyncCount, isLoading, lastRefreshed, refresh } =
    useDashboardStore();

  useEffect(() => {
    if (business) refresh(business.id);
  }, [business]);

  const handleRefresh = async () => {
    if (business) await refresh(business.id);
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{greeting()}, {user?.name?.split(' ')[0]}</Text>
          <Text style={styles.businessName}>{business?.name}</Text>
        </View>
        <View style={styles.headerActions}>
          {pendingSyncCount > 0 && (
            <TouchableOpacity
              style={styles.syncBadge}
              onPress={() => SyncEngine.run()}
            >
              <Ionicons name="sync" size={14} color={Colors.warning} />
              <Text style={styles.syncBadgeText}>{pendingSyncCount}</Text>
            </TouchableOpacity>
          )}
          {lastRefreshed > 0 && (
            <Text style={styles.lastSync}>Updated {formatTime(lastRefreshed)}</Text>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={handleRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Key Metrics Row */}
        <View style={styles.metricsRow}>
          <MetricCard
            label="Today's Sales"
            value={formatKES(summary?.total_revenue ?? 0)}
            icon="cash"
            color={Colors.success}
            bg={Colors.successLight}
          />
          <MetricCard
            label="Gross Profit"
            value={formatKES(summary?.gross_profit ?? 0)}
            icon="trending-up"
            color={Colors.primary}
            bg={Colors.infoLight}
          />
        </View>

        <View style={styles.metricsRow}>
          <MetricCard
            label="Transactions"
            value={String(summary?.total_transactions ?? 0)}
            icon="receipt"
            color={Colors.accent}
            bg={Colors.warningLight}
          />
          <MetricCard
            label="Profit Margin"
            value={formatPercent(summary?.profit_margin ?? 0)}
            icon="pie-chart"
            color={Colors.info}
            bg={Colors.infoLight}
          />
        </View>

        {/* Payment Breakdown */}
        {summary && summary.total_revenue > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Payment Methods</Text>
            <View style={styles.paymentRow}>
              <PaymentBar
                label="Cash"
                amount={summary.cash_revenue}
                total={summary.total_revenue}
                color={Colors.primary}
              />
              <PaymentBar
                label="M-Pesa"
                amount={summary.mpesa_revenue}
                total={summary.total_revenue}
                color={Colors.mpesa}
              />
            </View>
          </View>
        )}

        {/* AI-Style Insights */}
        {insights.length > 0 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="bulb" size={18} color={Colors.accent} />
              <Text style={styles.cardTitle}>Today's Insights</Text>
            </View>
            {insights.map((insight, i) => (
              <View key={i} style={styles.insight}>
                <View style={styles.insightDot} />
                <Text style={styles.insightText}>{insight}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Top Products */}
        {(summary?.top_products?.length ?? 0) > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top Sellers Today</Text>
            {summary!.top_products.map((p, i) => (
              <View key={p.product_id} style={styles.topProductRow}>
                <View style={styles.rank}>
                  <Text style={styles.rankText}>{i + 1}</Text>
                </View>
                <Text style={styles.productName} numberOfLines={1}>{p.product_name}</Text>
                <View style={styles.productStats}>
                  <Text style={styles.productRevenue}>{formatKES(p.total_revenue)}</Text>
                  <Text style={styles.productQty}>{p.total_qty} sold</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Low Stock Warning */}
        {lowStockCount > 0 && (
          <TouchableOpacity
            style={styles.alertCard}
            onPress={() => router.push('/(app)/inventory')}
            activeOpacity={0.85}
          >
            <Ionicons name="warning" size={20} color={Colors.warning} />
            <View style={{ flex: 1 }}>
              <Text style={styles.alertTitle}>{lowStockCount} products running low</Text>
              <Text style={styles.alertSub}>Tap to view and restock</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <QuickAction icon="cart" label="New Sale" onPress={() => router.push('/(app)/pos')} />
          <QuickAction icon="add-circle" label="Add Product" onPress={() => router.push('/(app)/inventory')} />
          <QuickAction icon="bar-chart" label="Reports" onPress={() => router.push('/(app)/reports')} />
        </View>

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

function MetricCard({
  label, value, icon, color, bg,
}: {
  label: string; value: string; icon: string; color: string; bg: string;
}) {
  return (
    <View style={[styles.metricCard, Shadow.sm]}>
      <View style={[styles.metricIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon as never} size={20} color={color} />
      </View>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function PaymentBar({
  label, amount, total, color,
}: {
  label: string; amount: number; total: number; color: string;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <View style={styles.paymentBarContainer}>
      <View style={styles.paymentBarHeader}>
        <View style={[styles.paymentDot, { backgroundColor: color }]} />
        <Text style={styles.paymentLabel}>{label}</Text>
        <Text style={styles.paymentAmount}>{formatKES(amount)}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.paymentPct}>{pct.toFixed(0)}%</Text>
    </View>
  );
}

function QuickAction({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.quickAction, Shadow.sm]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.qaIcon}>
        <Ionicons name={icon as never} size={22} color={Colors.primary} />
      </View>
      <Text style={styles.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const cardW = (width - Spacing.lg * 2 - Spacing.sm) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
  },
  greeting: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.8)' },
  businessName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textInverse },
  headerActions: { alignItems: 'flex-end', gap: 4 },
  syncBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: BorderRadius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  syncBadgeText: { fontSize: FontSize.xs, color: Colors.accent, fontWeight: FontWeight.bold },
  lastSync: { fontSize: FontSize.xs, color: 'rgba(255,255,255,0.6)' },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, gap: Spacing.md },
  metricsRow: { flexDirection: 'row', gap: Spacing.sm },
  metricCard: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, gap: Spacing.xs,
  },
  metricIcon: { width: 36, height: 36, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center' },
  metricValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.text },
  metricLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  card: {
    backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, gap: Spacing.sm,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardTitle: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, color: Colors.text },
  insight: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
  insightDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.accent, marginTop: 6 },
  insightText: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  topProductRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 4 },
  rank: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.background,
    justifyContent: 'center', alignItems: 'center',
  },
  rankText: { fontSize: FontSize.xs, fontWeight: FontWeight.bold, color: Colors.primary },
  productName: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  productStats: { alignItems: 'flex-end' },
  productRevenue: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  productQty: { fontSize: FontSize.xs, color: Colors.textMuted },
  paymentRow: { gap: Spacing.sm },
  paymentBarContainer: { gap: 4 },
  paymentBarHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  paymentDot: { width: 8, height: 8, borderRadius: 4 },
  paymentLabel: { flex: 1, fontSize: FontSize.sm, color: Colors.textSecondary },
  paymentAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  barTrack: { height: 6, backgroundColor: Colors.borderLight, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 3 },
  paymentPct: { fontSize: FontSize.xs, color: Colors.textMuted },
  alertCard: {
    backgroundColor: Colors.warningLight, borderRadius: BorderRadius.lg,
    padding: Spacing.md, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    borderWidth: 1, borderColor: Colors.warning,
  },
  alertTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.text },
  alertSub: { fontSize: FontSize.xs, color: Colors.textSecondary },
  quickActions: { flexDirection: 'row', gap: Spacing.sm },
  quickAction: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: BorderRadius.lg,
    padding: Spacing.md, alignItems: 'center', gap: Spacing.xs,
  },
  qaIcon: {
    width: 44, height: 44, borderRadius: BorderRadius.md,
    backgroundColor: Colors.infoLight, justifyContent: 'center', alignItems: 'center',
  },
  qaLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, color: Colors.textSecondary },
});
