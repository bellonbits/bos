import {
  Row, Col, Card, Typography, Tag,
  Space, Button, Progress, Empty, Spin,
} from 'antd';
import {
  CheckCircleFilled, DownloadOutlined, ReloadOutlined,
  ArrowUpOutlined, ArrowDownOutlined, ThunderboltOutlined, LockOutlined,
} from '@ant-design/icons';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart, Bar, Line, Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { AnalyticsAPI } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { formatKES, formatPercent, generateInsights } from '@/utils/formatters';
import { tokens, cactusTheme, darkTokens } from '@/theme';

const { Title, Text } = Typography;

const PIE_COLORS = ['#1E3A8A', '#F97316', '#10B981', '#FCD34D', '#1E293B'];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { business } = useAuthStore();
  const businessId = business?.id ?? '';

  const { data: daily, isLoading: dailyLoading, refetch: refetchDaily } = useQuery({
    queryKey: ['analytics', 'daily', businessId],
    queryFn: () => AnalyticsAPI.daily(businessId).then((r) => r.data),
    enabled: !!businessId,
    refetchInterval: 60_000,
  });

  const { data: weekly, isLoading: weeklyLoading } = useQuery({
    queryKey: ['analytics', 'weekly', businessId],
    queryFn: () => AnalyticsAPI.weekly(businessId).then((r) => r.data),
    enabled: !!businessId,
  });

  const weeklyData = weekly?.data ?? [];

  const { data: aiResponse, isLoading: aiLoading, refetch: refetchAI } = useQuery({
    queryKey: ['analytics', 'ai-insights', businessId],
    queryFn: () => AnalyticsAPI.aiInsights(businessId).then((r) => r.data),
    enabled: !!businessId && business?.subscription_tier !== 'free',
  });

  const aiInsights = aiResponse?.insights ?? [];

  // Build chart data — expenses estimated at 45% of revenue until expense tracking catches up
  const chartData = weeklyData.map(d => ({
    date: d.date,
    revenue: d.revenue,
    expenses: Math.round(d.revenue * 0.45),
    profit: Math.round(d.revenue * 0.55),
  }));

  const totalWeekRevenue = chartData.reduce((s: number, d: any) => s + d.revenue, 0);
  const totalWeekExpenses = chartData.reduce((s: number, d: any) => s + d.expenses, 0);
  const totalWeekProfit = chartData.reduce((s: number, d: any) => s + d.profit, 0);

  // Top products pie data from daily analytics
  const pieData = daily?.top_products?.length
    ? daily.top_products.slice(0, 5).map((p, i) => ({
        name: p.product_name,
        value: p.total_revenue,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
    : [];

  const insights = daily ? generateInsights(daily) : [];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <Row align="middle" justify="space-between" style={{ marginBottom: 32 }}>
        <Col>
          <Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: 24 }}>
            Dashboard overview
          </Title>
          <Text type="secondary">
            {daily?.date ? `Today · ${daily.date}` : 'Live business snapshot'}
          </Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={() => refetchDaily()} loading={dailyLoading}>
            Refresh
          </Button>
        </Col>
      </Row>

      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        {dailyLoading ? (
          <Col span={24} style={{ textAlign: 'center', padding: 40 }}>
            <Spin size="large" />
          </Col>
        ) : daily ? (
          <>
            <KPICard
              label="Today's Revenue"
              value={formatKES(daily.total_revenue)}
              sub={`${daily.total_transactions} transactions`}
              color={cactusTheme.accent}
              bg="#ECFDF5"
            />
            <KPICard
              label="Gross Profit"
              value={formatKES(daily.gross_profit)}
              sub={`${formatPercent(daily.profit_margin)} margin`}
              color={cactusTheme.accent}
              bg="#F0FDF4"
            />
            <KPICard
              label="Avg Order Value"
              value={formatKES(daily.avg_order_value)}
              sub={`${daily.total_transactions} orders today`}
              color={darkTokens.sidebarBg}
              bg="#F0F9FF"
            />
            <KPICard
              label="Cash Sales"
              value={formatKES(daily.cash_revenue)}
              sub={`M-Pesa: ${formatKES(daily.mpesa_revenue)} · Bank: ${formatKES(daily.bank_revenue)}`}
              color="#F97316"
              bg="#FFF7ED"
            />
          </>
        ) : (
          <Col span={24}>
            <Empty description="No sales recorded yet today. Start a sale from the Income page." />
          </Col>
        )}
      </Row>

      <Row gutter={[32, 32]}>
        {/* ── Main Content ─────────────────────────────────────────────────────── */}
        <Col xs={24} lg={17}>
          {/* AI Insights */}
          {insights.length > 0 && (
            <Card
              variant="borderless"
              style={{ borderRadius: 16, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', background: `${darkTokens.sidebarBg}08`, border: `1px solid ${darkTokens.sidebarBg}15` }}
            >
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Business Insights</Text>
              {insights.map((ins, i) => (
                <Text key={i} type="secondary" style={{ display: 'block', fontSize: 13, marginBottom: 4 }}>
                  · {ins}
                </Text>
              ))}
            </Card>
          )}

          {/* Weekly Revenue vs Expenses Chart */}
          <Card
            variant="borderless"
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', marginBottom: 24 }}
            title={<Text strong>Weekly Revenue vs Expenses</Text>}
            extra={
              <Space>
                <Tag bordered={false} color="success">Revenue {formatKES(totalWeekRevenue)}</Tag>
                <Tag bordered={false} color="error">Expenses {formatKES(totalWeekExpenses)}</Tag>
              </Space>
            }
          >
            {weeklyLoading ? (
              <div style={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Spin />
              </div>
            ) : chartData.length === 0 ? (
              <Empty style={{ padding: 60 }} description="No weekly data yet. Record sales to see trends." />
            ) : (
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} barGap={4} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Legend verticalAlign="top" align="right" height={36} />
                    <RTooltip
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                      formatter={(v: any) => formatKES(Number(v))}
                    />
                    <Bar name="Revenue" dataKey="revenue" fill={cactusTheme.accent} radius={[6, 6, 0, 0]} />
                    <Bar name="Expenses" dataKey="expenses" fill={cactusTheme.expense} radius={[6, 6, 0, 0]} />
                    <Line
                      name="Net Profit"
                      dataKey="profit"
                      type="monotone"
                      stroke={darkTokens.sidebarBg}
                      strokeWidth={2.5}
                      dot={{ r: 4, fill: darkTokens.sidebarBg, strokeWidth: 0 }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          {/* Weekly Summary Row */}
          <Row gutter={[16, 16]}>
            {[
              { label: 'Week Revenue', value: totalWeekRevenue, icon: <ArrowUpOutlined />, color: cactusTheme.accent },
              { label: 'Week Expenses', value: totalWeekExpenses, icon: <ArrowDownOutlined />, color: cactusTheme.expense },
              { label: 'Week Net Profit', value: totalWeekProfit, icon: <ArrowUpOutlined />, color: darkTokens.sidebarBg },
            ].map(item => (
              <Col key={item.label} xs={24} md={8}>
                <div style={{ padding: '14px 16px', borderRadius: 12, background: '#F8FAFC', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: `${item.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: item.color }}>
                    {item.icon}
                  </div>
                  <div>
                    <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>{item.label}</Text>
                    <Text strong style={{ color: item.color, fontSize: 16 }}>{formatKES(item.value)}</Text>
                  </div>
                </div>
              </Col>
            ))}
          </Row>
        </Col>

        {/* ── Right Sidebar ─────────────────────────────────────────────────────── */}
        <Col xs={24} lg={7}>
          {/* Setup Progress */}
          <Card
            variant="borderless"
            style={{ borderRadius: 16, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text strong>Account Setup</Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>2/3 done</Text>
                <Progress percent={66} size="small" showInfo={false} style={{ width: 60 }} strokeColor={tokens.primary} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <SetupItem title="Business Profile Created" desc="Your business is registered on Biashara OS" completed />
              <SetupItem title="Products Added" desc={`${daily ? `${(daily.top_products ?? []).length} products in catalogue` : 'Add your first product to start selling'}`} completed={!!daily?.top_products?.length} />
              <SetupItem title="First Sale Recorded" desc="Complete a sale via the Income (POS) page" completed={!!daily && daily.total_transactions > 0} />
              <Button
                block
                style={{ marginTop: 8, height: 40, borderRadius: 8, background: darkTokens.sidebarBg, color: '#fff', border: 'none', fontWeight: 600 }}
                onClick={() => navigate('/income')}
              >
                Go to POS
              </Button>
            </div>
          </Card>

          {/* AI Insights Widget */}
          <Card
            variant="borderless"
            style={{ 
              borderRadius: 16, 
              marginBottom: 24, 
              boxShadow: '0 4px 20px rgba(16,185,129,0.08)',
              background: '#fff',
              overflow: 'hidden',
              position: 'relative',
              border: business?.subscription_tier !== 'free' ? `1px solid ${cactusTheme.accent}30` : '1px solid #E2E8F0'
            }}
          >
            {business?.subscription_tier === 'free' && (
              <div style={{ 
                position: 'absolute', inset: 0, zIndex: 10, 
                backdropFilter: 'blur(4px)', background: 'rgba(255,255,255,0.6)',
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20, textAlign: 'center'
              }}>
                <LockOutlined style={{ fontSize: 24, color: '#64748B', marginBottom: 12 }} />
                <Text strong style={{ display: 'block', fontSize: 13 }}>Standard Feature</Text>
                <Text type="secondary" style={{ fontSize: 11, marginBottom: 16 }}>Upgrade to unlock AI-powered business advice</Text>
                <Button size="small" type="primary" style={{ background: cactusTheme.accent, border: 'none', borderRadius: 6 }} onClick={() => navigate('/pricing')}>Upgrade</Button>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Space>
                <div style={{ padding: 6, borderRadius: 8, background: `${cactusTheme.accent}15`, display: 'flex' }}>
                  <ThunderboltOutlined style={{ color: cactusTheme.accent }} />
                </div>
                <Text strong>AI Insights</Text>
              </Space>
              {business?.subscription_tier !== 'free' && (
                <Button type="text" size="small" icon={<ReloadOutlined style={{ fontSize: 12 }} />} onClick={() => refetchAI()} loading={aiLoading} />
              )}
            </div>

            {aiLoading ? (
              <div style={{ padding: '8px 0' }}><Spin size="small" /></div>
            ) : aiInsights.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {aiInsights.map((insight, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: cactusTheme.accent, marginTop: 8, flexShrink: 0 }} />
                    <Text style={{ fontSize: 13, lineHeight: 1.5 }}>{insight}</Text>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>No insights available yet for today's data.</Text>
              </div>
            )}
          </Card>

          {/* Top Products Breakdown */}
          <Card
            variant="borderless"
            style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}
            title={<Text strong>Top Products Today</Text>}
            extra={<Button type="text" size="small" icon={<DownloadOutlined />} />}
          >
            {pieData.length === 0 ? (
              <Empty style={{ padding: 32 }} description="No sales yet today" />
            ) : (
              <>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RTooltip formatter={(v: any) => formatKES(Number(v))} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                  {pieData.map(item => (
                    <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space size={8}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
                        <Text style={{ fontSize: 12 }} ellipsis>{item.name}</Text>
                      </Space>
                      <Text strong style={{ fontSize: 12 }}>{formatKES(item.value)}</Text>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

function KPICard({ label, value, sub, color, bg }: any) {
  return (
    <Col xs={12} lg={6}>
      <div style={{ padding: '16px 20px', borderRadius: 14, background: bg, borderLeft: `4px solid ${color}` }}>
        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>{label}</Text>
        <Text strong style={{ fontSize: 20, color, display: 'block' }}>{value}</Text>
        <Text style={{ fontSize: 11, color: '#94A3B8' }}>{sub}</Text>
      </div>
    </Col>
  );
}

function SetupItem({ title, desc, completed }: { title: string; desc: string; completed: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ marginTop: 2 }}>
        {completed
          ? <CheckCircleFilled style={{ color: '#10B981', fontSize: 16 }} />
          : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid #E2E8F0' }} />}
      </div>
      <div>
        <Text strong style={{ fontSize: 13, display: 'block', color: completed ? '#1e293b' : '#94a3b8' }}>{title}</Text>
        <Text style={{ fontSize: 11, color: '#94a3b8', lineHeight: 1.4 }}>{desc}</Text>
      </div>
    </div>
  );
}
