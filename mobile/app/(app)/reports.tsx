import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { useAuthStore } from '@stores/authStore';
import { SaleRepo, type DailySummary, type DailyRevenue } from '@db/repositories/SaleRepo';
import { ProductRepo } from '@db/repositories/ProductRepo';
import {
  Colors, Spacing, FontSize, FontWeight, BorderRadius, Shadow,
} from '@constants/theme';
import { formatKES, formatDate, formatPercent } from '@utils/helpers';

const { width } = Dimensions.get('window');

export default function ReportsScreen() {
  const { business } = useAuthStore();
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [weeklyData, setWeeklyData] = useState<DailyRevenue[]>([]);
  const [stockValue, setStockValue] = useState({ total_value: 0, total_cost: 0 });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!business) return;
    loadData(business.id);
  }, [business, period]);

  async function loadData(businessId: string) {
    setIsLoading(true);
    try {
      const [s, weekly, stock] = await Promise.all([
        SaleRepo.getDailySummary(businessId, Date.now()),
        SaleRepo.getWeeklySummary(businessId),
        ProductRepo.getStockValue(businessId),
      ]);
      setSummary(s);
      setWeeklyData(weekly);
      setStockValue(stock);
    } finally {
      setIsLoading(false);
    }
  }

  const chartLabels = weeklyData.map((d) => d.date.slice(5)); // MM-DD
  const chartValues = weeklyData.map((d) => d.revenue);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
        <Text style={styles.headerSub}>{formatDate(Date.now())}</Text>
      </View>

      {/* Period selector */}
      <View style={styles.periodSelector}>
        {(['today', 'week', 'month'] as const).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodTab, period === p && styles.periodTabActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
              {p === 'today' ? 'Today' : p === 'week' ? 'This Week' : 'This Month'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Revenue Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Revenue Summary</Text>
          <View style={styles.grid2}>
            <SummaryCard
              label="Total Revenue"
              value={formatKES(summary?.total_revenue ?? 0)}
              icon="cash"
              color={Colors.success}
            />
            <SummaryCard
              label="Gross Profit"
              value={formatKES(summary?.gross_profit ?? 0)}
              icon="trending-up"
              color={Colors.primary}
            />
            <SummaryCard
              label="Transactions"
              value={String(summary?.total_transactions ?? 0)}
              icon="receipt"
              color={Colors.accent}
            />
            <SummaryCard
              label="Profit Margin"
              value={formatPercent(summary?.profit_margin ?? 0)}
              icon="pie-chart"
              color={Colors.info}
            />
          </View>
        </View>

        {/* 7-day Revenue Chart */}
        {weeklyData.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7-Day Revenue</Text>
            <View style={[styles.chartCard, Shadow.sm]}>
              <BarChart
                data={{
                  labels: chartLabels,
                  datasets: [{ data: chartValues.length > 0 ? chartValues : [0] }],
                }}
                width={width - Spacing.lg * 2 - Spacing.md * 2}
                height={180}
                yAxisLabel="KSh "
                yAxisSuffix=""
                chartConfig={{
                  backgroundColor: Colors.surface,
                  backgroundGradientFrom: Colors.surface,
                  backgroundGradientTo: Colors.surface,
                  decimalPlaces: 0,
                  color: () => Colors.primary,
                  labelColor: () => Colors.textSecondary,
                  style: { borderRadius: 8 },
                  barPercentage: 0.7,
                }}
                style={{ borderRadius: BorderRadius.md }}
              />
            </View>
          </View>
        )}

        {/* Payment breakdown */}
        {summary && summary.total_revenue > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Methods</Text>
            <View style={[styles.card, Shadow.sm]}>
              <PaymentBreakdownRow
                label="Cash"
                amount={summary.cash_revenue}
                total={summary.total_revenue}
                color={Colors.primary}
              />
              <View style={styles.divider} />
              <PaymentBreakdownRow
                label="M-Pesa"
                amount={summary.mpesa_revenue}
                total={summary.total_revenue}
                color={Colors.mpesa}
              />
            </View>
          </View>
        )}

        {/* Top Products */}
        {(summary?.top_products?.length ?? 0) > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Products</Text>
            <View style={[styles.card, Shadow.sm]}>
              {summary!.top_products.map((p, i) => (
                <View key={p.product_id}>
                  {i > 0 && <View style={styles.divider} />}
                  <View style={styles.topProductRow}>
                    <Text style={styles.rankNum}>#{i + 1}</Text>
                    <Text style={styles.topProductName} numberOfLines={1}>{p.product_name}</Text>
                    <View style={styles.topProductStats}>
                      <Text style={styles.topProductRevenue}>{formatKES(p.total_revenue)}</Text>
                      <Text style={styles.topProductQty}>{p.total_qty} units sold</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Inventory Value */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventory Value</Text>
          <View style={styles.grid2}>
            <SummaryCard
              label="Stock Value"
              value={formatKES(stockValue.total_value)}
              icon="cube"
              color={Colors.primary}
            />
            <SummaryCard
              label="Stock at Cost"
              value={formatKES(stockValue.total_cost)}
              icon="pricetag"
              color={Colors.textSecondary}
            />
          </View>
          {stockValue.total_value > 0 && (
            <View style={[styles.card, Shadow.sm, { marginTop: Spacing.sm }]}>
              <Text style={styles.insight}>
                Potential revenue from current stock: {formatKES(stockValue.total_value)}
              </Text>
              <Text style={[styles.insight, { color: Colors.success }]}>
                Potential profit if all stock sold: {formatKES(stockValue.total_value - stockValue.total_cost)}
              </Text>
            </View>
          )}
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

function SummaryCard({ label, value, icon, color }: {
  label: string; value: string; icon: string; color: string;
}) {
  return (
    <View style={[styles.summaryCard, Shadow.sm]}>
      <View style={[styles.summaryIcon, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as never} size={20} color={color} />
      </View>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function PaymentBreakdownRow({ label, amount, total, color }: {
  label: string; amount: number; total: number; color: string;
}) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <View style={styles.payRow}>
      <View style={[styles.payDot, { backgroundColor: color }]} />
      <Text style={styles.payLabel}>{label}</Text>
      <View style={styles.payBarTrack}>
        <View style={[styles.payBarFill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
      <Text style={styles.payAmount}>{formatKES(amount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.primary, paddingTop: 56, paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  headerTitle: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textInverse },
  headerSub: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)' },
  periodSelector: {
    flexDirection: 'row', gap: Spacing.xs, padding: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  periodTab: {
    flex: 1, paddingVertical: 8, borderRadius: BorderRadius.md,
    alignItems: 'center', backgroundColor: Colors.background,
  },
  periodTabActive: { backgroundColor: Colors.primary },
  periodTabText: { fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: FontWeight.medium },
  periodTabTextActive: { color: Colors.textInverse },
  content: { padding: Spacing.lg, gap: Spacing.lg },
  section: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.text },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  summaryCard: {
    flex: 1, minWidth: '45%', backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.xs,
  },
  summaryIcon: { width: 36, height: 36, borderRadius: BorderRadius.sm, justifyContent: 'center', alignItems: 'center' },
  summaryValue: { fontSize: FontSize.lg, fontWeight: FontWeight.extrabold, color: Colors.text },
  summaryLabel: { fontSize: FontSize.xs, color: Colors.textSecondary },
  chartCard: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md },
  card: { backgroundColor: Colors.surface, borderRadius: BorderRadius.lg, padding: Spacing.md, gap: Spacing.sm },
  divider: { height: 1, backgroundColor: Colors.borderLight, marginVertical: 4 },
  payRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  payDot: { width: 10, height: 10, borderRadius: 5 },
  payLabel: { width: 60, fontSize: FontSize.sm, color: Colors.textSecondary },
  payBarTrack: { flex: 1, height: 8, backgroundColor: Colors.borderLight, borderRadius: 4, overflow: 'hidden' },
  payBarFill: { height: '100%', borderRadius: 4 },
  payAmount: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text, minWidth: 80, textAlign: 'right' },
  topProductRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  rankNum: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.primary, width: 24 },
  topProductName: { flex: 1, fontSize: FontSize.sm, color: Colors.text },
  topProductStats: { alignItems: 'flex-end' },
  topProductRevenue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text },
  topProductQty: { fontSize: FontSize.xs, color: Colors.textMuted },
  insight: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
});
