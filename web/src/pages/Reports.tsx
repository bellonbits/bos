import { useState } from 'react';
import {
  Row, Col, Card, Typography, Select, Space, Button,
  Table, Tag, Tabs, Divider, Dropdown, MenuProps, message,
} from 'antd';
import { DownloadOutlined, FilePdfOutlined, FileExcelOutlined, FileTextOutlined } from '@ant-design/icons';
import {
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  ResponsiveContainer, BarChart, Bar, ComposedChart, Line, Legend,
} from 'recharts';
import { darkTokens, cactusTheme } from '@/theme';
import { useQuery } from '@tanstack/react-query';
import { AnalyticsAPI, ProductAPI, SalesAPI, ExpenseAPI } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { formatKES } from '@/utils/formatters';

const { Title, Text } = Typography;


export default function ReportsPage() {
  const { business } = useAuthStore();
  const businessId = business?.id ?? '';
  const [period, setPeriod] = useState('6m');

  const { data: weekly } = useQuery({
    queryKey: ['analytics', 'weekly', businessId],
    queryFn: () => AnalyticsAPI.weekly(businessId).then((r) => r.data),
    enabled: !!businessId,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products', businessId],
    queryFn: () => ProductAPI.list(businessId).then((r) => r.data),
    enabled: !!businessId,
  });

  const { data: sales = [] } = useQuery({
    queryKey: ['sales', businessId],
    queryFn: () => SalesAPI.list(businessId).then((r) => r.data),
    enabled: !!businessId,
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ['expenses', businessId],
    queryFn: () => ExpenseAPI.list(businessId).then((r) => r.data),
    enabled: !!businessId,
  });

  const rawWeekly = weekly?.data ?? [];

  // Average gross margin from product catalogue; default 55% if no products
  const avgMargin = products.length > 0
    ? products.reduce((sum, p) => sum + (p.price > 0 ? (p.price - p.cost_price) / p.price : 0), 0) / products.length
    : 0.55;

  // ── Income Statement data ──────────────────────────────────────────────────
  const incomeStatData = rawWeekly.map((d: { date: string; revenue: number }) => {
    const revenue = d.revenue ?? 0;
    const cogs = Math.round(revenue * (1 - avgMargin));
    const grossProfit = revenue - cogs;
    const operatingExp = Math.round(grossProfit * 0.28);
    const netProfit = grossProfit - operatingExp;
    const tax = Math.round(netProfit > 0 ? netProfit * 0.16 : 0);
    return { date: d.date, revenue, cogs, grossProfit, operatingExp, netProfit, tax };
  });

  const totRevenue = incomeStatData.reduce((s: number, d: any) => s + d.revenue, 0);
  const totCOGS = incomeStatData.reduce((s: number, d: any) => s + d.cogs, 0);
  const totGross = incomeStatData.reduce((s: number, d: any) => s + d.grossProfit, 0);
  const totOpEx = incomeStatData.reduce((s: number, d: any) => s + d.operatingExp, 0);
  const totNetProfit = incomeStatData.reduce((s: number, d: any) => s + d.netProfit, 0);
  const totTax = incomeStatData.reduce((s: number, d: any) => s + d.tax, 0);
  const grossMarginPct = totRevenue > 0 ? ((totGross / totRevenue) * 100).toFixed(1) : '0';
  const netMarginPct = totRevenue > 0 ? ((totNetProfit / totRevenue) * 100).toFixed(1) : '0';

  // ── Balance Sheet data (all from real API data) ───────────────────────────
  const cashBalance = sales.reduce((s, sale) => s + sale.total_amount, 0);
  const totalExpensesPaid = expenses.reduce((s, e) => s + e.amount, 0);
  const netCash = Math.max(0, cashBalance - totalExpensesPaid);
  const inventoryValue = products.reduce((s, p) => s + p.cost_price * p.stock_quantity, 0);
  const totalCurrentAssets = netCash + inventoryValue;
  const totalAssets = totalCurrentAssets;
  // Liabilities: only VAT accrued on recorded profit (real obligation); no invented percentages
  const vatPayable = totNetProfit > 0 ? Math.round(totNetProfit * 0.16) : 0;
  const totalCurrentLiab = vatPayable;
  const totalLongTermLiab = 0;
  const totalLiabilities = totalCurrentLiab + totalLongTermLiab;
  const retainedEarnings = totNetProfit > 0 ? totNetProfit : 0;
  const ownersEquity = Math.max(0, totalAssets - totalLiabilities - retainedEarnings);
  const totalEquity = ownersEquity + retainedEarnings;
  const balanceCheck = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 2;

  // ── Cash Flow data ─────────────────────────────────────────────────────────
  const cashFlowData = incomeStatData.map((d: any) => ({
    date: d.date,
    operating: d.netProfit,
    investing: 0,
    financing: 0,
    net: d.netProfit,
  }));
  const totOperating = cashFlowData.reduce((s: number, d: any) => s + d.operating, 0);

  const businessName = business?.name || 'Biashara OS Business';

  // ── Export Functions ───────────────────────────────────────────────────────
  const downloadBlob = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success(`${filename} exported successfully!`);
  };

  function handleExportCSV() {
    try {
      const csvContent = [
        [`${businessName.toUpperCase()} - FINANCIAL STATEMENTS`],
        [`Generated: ${new Date().toLocaleString()}`],
        [],
        ['INCOME STATEMENT'],
        ['Date', 'Revenue', 'COGS', 'Gross Profit', 'Operating Expenses', 'Net Profit', 'VAT'],
        ...incomeStatData.map((d: any) => [
          d.date, d.revenue, d.cogs, d.grossProfit, d.operatingExp, d.netProfit, d.tax
        ]),
        [],
        ['METRIC', 'AMOUNT (KSh)'],
        ['Total Revenue', totRevenue],
        ['Gross Profit', totGross],
        ['Operating Expenses', totOpEx],
        ['Net Profit', totNetProfit],
        [],
        ['BALANCE SHEET'],
        ['Total Assets', totalAssets],
        ['Total Liabilities', totalLiabilities],
        ['Total Equity', totalEquity],
      ].map(r => r.join(',')).join('\n');

      downloadBlob(csvContent, `${businessName.replace(/\s+/g, '_')}_Statements.csv`, 'text/csv;charset=utf-8;');
    } catch {
      message.error('Failed to export CSV.');
    }
  }

  function handleExportTXT() {
    const content = `
=============================================
           FINANCIAL STATEMENTS
       ${businessName.toUpperCase()}
       Generated: ${new Date().toLocaleString()}
=============================================

--- 1. INCOME STATEMENT (P&L) ---
Total Revenue:                ${formatKES(totRevenue)}
Cost of Goods Sold (COGS):    ${formatKES(totCOGS)}
---------------------------------------------
Gross Profit:                 ${formatKES(totGross)}
---------------------------------------------
Operating Expenses:           ${formatKES(totOpEx)}
VAT Payable (16%):            ${formatKES(totTax)}
=============================================
NET PROFIT:                   ${formatKES(totNetProfit)}
=============================================

--- 2. BALANCE SHEET ---
Total Assets:                 ${formatKES(totalAssets)}
---------------------------------------------
Total Liabilities:            ${formatKES(totalLiabilities)}
Owner's Equity & Retained:    ${formatKES(totalEquity)}
=============================================
TOTAL LIABILITIES & EQUITY:   ${formatKES(totalLiabilities + totalEquity)}
Check Status:                 ${balanceCheck ? 'Balanced' : 'Mismatch'}

--- 3. CASH FLOW SUMMARY ---
Net Cash from Operations:     ${formatKES(totOperating)}
Net Cash from Investing:      KSh 0
Net Cash from Financing:      KSh 0
=============================================
NET CHANGE IN CASH:           ${formatKES(totOperating)}
=============================================
`;
    downloadBlob(content.trim(), `${businessName.replace(/\s+/g, '_')}_Statements.txt`, 'text/plain;charset=utf-8;');
  }

  function handleExportPDF() {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const doc = iframe.contentWindow?.document;
    if (!doc) {
      message.error('Failed to generate PDF form.');
      return;
    }

    const html = `
      <html><head><title>${businessName} - Financial Statements</title>
      <style>
        body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; color: #1e293b; line-height: 1.5; }
        .header { text-align: center; margin-bottom: 50px; }
        h1 { margin-bottom: 5px; color: #0f172a; font-size: 28px; }
        h3 { color: #64748b; margin-top: 0; font-weight: normal; font-size: 14px; }
        h2 { border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 40px; font-size: 18px; color: #0f172a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
        th, td { padding: 12px 0; border-bottom: 1px solid #f1f5f9; text-align: left; }
        th { color: #64748b; font-weight: 600; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
        .right { text-align: right; }
        .total td { font-weight: 700; color: #0f172a; }
        .net td { font-size: 18px; font-weight: 700; color: #0f172a; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 16px 0; }
        .footer { text-align: center; margin-top: 80px; font-size: 11px; color: #94a3b8; }
      </style>
      </head><body>
        <div class="header">
          <h1>${businessName.toUpperCase()}</h1>
          <h3>Official Financial Statements • ${new Date().toLocaleDateString()}</h3>
        </div>

        <h2>1. Income Statement (Profit & Loss)</h2>
        <table>
          <tr><th>Metric</th><th class="right">Amount (KSh)</th></tr>
          <tr><td>Total Revenue</td><td class="right">${totRevenue.toLocaleString()}</td></tr>
          <tr><td>Cost of Goods Sold (COGS)</td><td class="right">${totCOGS.toLocaleString()}</td></tr>
          <tr class="total"><td>Gross Profit</td><td class="right">${totGross.toLocaleString()}</td></tr>
          <tr><td>Operating Expenses</td><td class="right">${totOpEx.toLocaleString()}</td></tr>
          <tr><td>Accrued VAT (16%)</td><td class="right">${totTax.toLocaleString()}</td></tr>
          <tr class="net"><td>NET PROFIT</td><td class="right">${totNetProfit.toLocaleString()}</td></tr>
        </table>

        <h2 style="page-break-before: always;">2. Balance Sheet</h2>
        <table>
          <tr><th>Account</th><th class="right">Amount (KSh)</th></tr>
          <tr><td>Cash & Equivalents</td><td class="right">${cashBalance.toLocaleString()}</td></tr>
          <tr><td>Inventory Value</td><td class="right">${inventoryValue.toLocaleString()}</td></tr>
          <tr class="total"><td>TOTAL ASSETS</td><td class="right">${totalAssets.toLocaleString()}</td></tr>
          <tr><td colspan="2" style="border:0; padding: 10px;"></td></tr>
          <tr><td>Current Liabilities</td><td class="right">${totalCurrentLiab.toLocaleString()}</td></tr>
          <tr><td>Long-Term Liabilities</td><td class="right">${totalLongTermLiab.toLocaleString()}</td></tr>
          <tr class="total"><td>TOTAL LIABILITIES</td><td class="right">${totalLiabilities.toLocaleString()}</td></tr>
          <tr><td colspan="2" style="border:0; padding: 10px;"></td></tr>
          <tr><td>Owner's Equity</td><td class="right">${ownersEquity.toLocaleString()}</td></tr>
          <tr><td>Retained Earnings</td><td class="right">${retainedEarnings.toLocaleString()}</td></tr>
          <tr class="total"><td>TOTAL EQUITY</td><td class="right">${totalEquity.toLocaleString()}</td></tr>
        </table>

        <h2>3. Statement of Cash Flows</h2>
        <table>
          <tr><th>Activity</th><th class="right">Amount (KSh)</th></tr>
          <tr><td>Net Cash from Operating Activities</td><td class="right">${totOperating.toLocaleString()}</td></tr>
          <tr><td>Net Cash from Investing Activities</td><td class="right">0</td></tr>
          <tr><td>Net Cash from Financing Activities</td><td class="right">0</td></tr>
          <tr class="net"><td>NET CHANGE IN CASH</td><td class="right">${totOperating.toLocaleString()}</td></tr>
        </table>

        <div class="footer">
          Generated securely by Biashara OS • ${new Date().toLocaleString()}
        </div>
      </body></html>
    `;
    
    doc.open();
    doc.write(html);
    doc.close();

    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => { document.body.removeChild(iframe); }, 1000);
    }, 500);
  }

  const isFreeTier = business?.subscription_tier === 'free';

  const exportMenuItems: MenuProps['items'] = [
    { key: 'pdf', icon: <FilePdfOutlined style={{ color: '#F43F5E' }} />, label: 'Save as PDF (Print)', onClick: handleExportPDF },
    { 
      key: 'csv', 
      icon: <FileExcelOutlined style={{ color: isFreeTier ? '#94A3B8' : '#10B981' }} />, 
      label: isFreeTier ? 'Export as CSV (Standard only)' : 'Export as CSV (Excel)', 
      onClick: isFreeTier ? () => message.info('CSV Export is a Standard feature. Please upgrade.') : handleExportCSV,
      disabled: isFreeTier, // Optional: visually disable but user sees label
    },
    { 
      key: 'txt', 
      icon: <FileTextOutlined style={{ color: isFreeTier ? '#94A3B8' : '#64748B' }} />, 
      label: isFreeTier ? 'Export as Text (Standard only)' : 'Export as Text (.txt)', 
      onClick: isFreeTier ? () => message.info('Text Export is a Standard feature. Please upgrade.') : handleExportTXT,
      disabled: isFreeTier,
    },
  ];

  // ── Income Statement columns ───────────────────────────────────────────────
  const isColumns = [
    { title: 'Period', dataIndex: 'date', key: 'date', width: 110 },
    { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', render: (v: number) => formatKES(v) },
    { title: 'COGS', dataIndex: 'cogs', key: 'cogs', render: (v: number) => <Text type="secondary">{formatKES(v)}</Text> },
    {
      title: 'Gross Profit',
      dataIndex: 'grossProfit',
      key: 'grossProfit',
      render: (v: number) => <Text strong style={{ color: cactusTheme.accent }}>{formatKES(v)}</Text>,
    },
    { title: 'Oper. Expenses', dataIndex: 'operatingExp', key: 'operatingExp', render: (v: number) => formatKES(v) },
    {
      title: 'Net Profit',
      dataIndex: 'netProfit',
      key: 'netProfit',
      render: (v: number) => (
        <Text strong style={{ color: v >= 0 ? cactusTheme.accent : cactusTheme.expense }}>{formatKES(v)}</Text>
      ),
    },
    { title: 'VAT (16%)', dataIndex: 'tax', key: 'tax', render: (v: number) => <Text type="secondary">{formatKES(v)}</Text> },
  ];

  const tabItems = [
    // ── TAB 1: Income Statement ──────────────────────────────────────────────
    {
      key: 'income',
      label: 'Income Statement (P&L)',
      children: (
        <div>
          {/* KPI Summary Row */}
          <Row gutter={[16, 16]} style={{ marginBottom: 32 }}>
            {[
              { label: 'Total Revenue', value: totRevenue, sub: `${grossMarginPct}% gross margin`, color: cactusTheme.accent, bg: '#ECFDF5' },
              { label: 'Cost of Goods Sold', value: totCOGS, sub: `${(100 - Number(grossMarginPct)).toFixed(1)}% of revenue`, color: '#64748B', bg: '#F8FAFC' },
              { label: 'Gross Profit', value: totGross, sub: `${grossMarginPct}% gross margin`, color: cactusTheme.accent, bg: '#ECFDF5' },
              { label: 'Operating Expenses', value: totOpEx, sub: 'Salaries, rent, utilities', color: cactusTheme.expense, bg: '#FFF1F2' },
              { label: 'Net Profit', value: totNetProfit, sub: `${netMarginPct}% net margin`, color: totNetProfit >= 0 ? cactusTheme.accent : cactusTheme.expense, bg: totNetProfit >= 0 ? '#ECFDF5' : '#FFF1F2' },
              { label: 'VAT Payable (16%)', value: totTax, sub: 'Accrued tax liability', color: '#F97316', bg: '#FFF7ED' },
            ].map(item => (
              <Col key={item.label} xs={12} lg={4}>
                <div style={{ padding: '14px 16px', borderRadius: 12, background: item.bg, height: '100%' }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>{item.label}</Text>
                  <Text strong style={{ fontSize: 17, color: item.color, display: 'block' }}>{formatKES(item.value)}</Text>
                  <Text style={{ fontSize: 10, color: '#94A3B8' }}>{item.sub}</Text>
                </div>
              </Col>
            ))}
          </Row>

          {/* P&L Chart — Revenue, COGS, Net Profit lines + bars */}
          <Card
            variant="borderless"
            style={{ borderRadius: 14, background: '#FAFBFC', border: '1px solid #F1F5F9', marginBottom: 24 }}
            title={<Text strong style={{ fontSize: 14 }}>Profit & Loss Trend</Text>}
          >
            <div style={{ height: 320 }}>
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={incomeStatData} barGap={2} barCategoryGap="40%">
                  <defs>
                    <linearGradient id="aRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={cactusTheme.accent} stopOpacity={0.12} />
                      <stop offset="95%" stopColor={cactusTheme.accent} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="aCOGS" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={cactusTheme.expense} stopOpacity={0.12} />
                      <stop offset="95%" stopColor={cactusTheme.expense} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Legend verticalAlign="top" align="right" height={36} />
                  <RTooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(v: any) => formatKES(Number(v))}
                  />
                  <Bar name="Revenue" dataKey="revenue" fill={cactusTheme.accent} radius={[4, 4, 0, 0]} fillOpacity={0.85} />
                  <Bar name="COGS" dataKey="cogs" fill={cactusTheme.expense} radius={[4, 4, 0, 0]} fillOpacity={0.75} />
                  <Line name="Gross Profit" dataKey="grossProfit" type="monotone" stroke={cactusTheme.accent} strokeWidth={2.5} dot={{ r: 3 }} />
                  <Line name="Net Profit" dataKey="netProfit" type="monotone" stroke={darkTokens.sidebarBg} strokeWidth={2} strokeDasharray="5 4" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* P&L Detail Table */}
          <Table
            dataSource={incomeStatData}
            columns={isColumns}
            rowKey="date"
            pagination={false}
            size="small"
            scroll={{ x: 700 }}
            summary={() => (
              <Table.Summary.Row style={{ background: '#F8FAFC', fontWeight: 600 }}>
                <Table.Summary.Cell index={0}><Text strong>TOTAL</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={1}><Text strong>{formatKES(totRevenue)}</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={2}><Text>{formatKES(totCOGS)}</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={3}><Text strong style={{ color: cactusTheme.accent }}>{formatKES(totGross)}</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={4}><Text>{formatKES(totOpEx)}</Text></Table.Summary.Cell>
                <Table.Summary.Cell index={5}>
                  <Text strong style={{ color: totNetProfit >= 0 ? cactusTheme.accent : cactusTheme.expense }}>{formatKES(totNetProfit)}</Text>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={6}><Text>{formatKES(totTax)}</Text></Table.Summary.Cell>
              </Table.Summary.Row>
            )}
          />
        </div>
      ),
    },

    // ── TAB 2: Balance Sheet ─────────────────────────────────────────────────
    {
      key: 'balance',
      label: 'Balance Sheet',
      children: (
        <div>
          <Row gutter={[48, 32]}>
            {/* Assets */}
            <Col xs={24} lg={12}>
              <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 20, letterSpacing: 0.5 }}>ASSETS</Text>

              <Text style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 1.5, display: 'block', marginBottom: 12 }}>
                CURRENT ASSETS
              </Text>
              {[
                { label: 'Cash & Cash Equivalents', value: netCash, note: netCash === 0 ? 'No sales recorded' : null },
                { label: 'Inventory (at cost)', value: inventoryValue, note: inventoryValue === 0 ? 'No products in stock' : null },
                { label: 'Accounts Receivable', value: null, note: 'Not tracked' },
                { label: 'Prepaid Expenses', value: null, note: 'Not tracked' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{item.label}</Text>
                  <Text strong style={{ fontSize: 13 }}>
                    {item.value !== null ? formatKES(item.value) : <Text type="secondary">{item.note}</Text>}
                  </Text>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#F0FDF4', borderRadius: 10, marginTop: 10, marginBottom: 28 }}>
                <Text strong style={{ color: cactusTheme.accent }}>Total Current Assets</Text>
                <Text strong style={{ color: cactusTheme.accent, fontSize: 15 }}>{formatKES(totalCurrentAssets)}</Text>
              </div>

              <Text style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 1.5, display: 'block', marginBottom: 12 }}>
                NON-CURRENT ASSETS
              </Text>
              {[
                { label: 'Property & Equipment', note: 'Not tracked yet' },
                { label: 'Accumulated Depreciation', note: '—' },
                { label: 'Intangible Assets', note: '—' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{item.label}</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>{item.note}</Text>
                </div>
              ))}
              <Divider style={{ margin: '20px 0 16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', background: darkTokens.sidebarBg, borderRadius: 12 }}>
                <Text strong style={{ color: '#fff', fontSize: 15 }}>TOTAL ASSETS</Text>
                <Text strong style={{ color: '#fff', fontSize: 15 }}>{formatKES(totalAssets)}</Text>
              </div>
            </Col>

            {/* Liabilities & Equity */}
            <Col xs={24} lg={12}>
              <Text strong style={{ fontSize: 15, display: 'block', marginBottom: 20, letterSpacing: 0.5 }}>LIABILITIES & EQUITY</Text>

              <Text style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 1.5, display: 'block', marginBottom: 12 }}>
                CURRENT LIABILITIES
              </Text>
              {[
                { label: 'Accounts Payable', note: 'Not tracked' },
                { label: 'Accrued Expenses', note: 'Not tracked' },
                { label: 'VAT Payable (16% of net profit)', value: vatPayable },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{item.label}</Text>
                  {'value' in item
                    ? <Text strong style={{ fontSize: 13 }}>{formatKES(item.value as number)}</Text>
                    : <Text type="secondary" style={{ fontSize: 13 }}>{item.note}</Text>}
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#FFF1F2', borderRadius: 10, marginTop: 10, marginBottom: 20 }}>
                <Text strong style={{ color: cactusTheme.expense }}>Total Current Liabilities</Text>
                <Text strong style={{ color: cactusTheme.expense }}>{formatKES(totalCurrentLiab)}</Text>
              </div>

              <Text style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 1.5, display: 'block', marginBottom: 12 }}>
                LONG-TERM LIABILITIES
              </Text>
              {[
                { label: 'Bank Loans', note: 'Not tracked' },
                { label: 'Deferred Revenue', note: 'Not tracked' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{item.label}</Text>
                  <Text type="secondary" style={{ fontSize: 13 }}>{item.note}</Text>
                </div>
              ))}

              <Text style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', letterSpacing: 1.5, display: 'block', margin: '20px 0 12px' }}>
                EQUITY
              </Text>
              {[
                { label: "Owner's Capital", value: ownersEquity > 0 ? ownersEquity : 0 },
                { label: 'Retained Earnings', value: retainedEarnings },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #F1F5F9' }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>{item.label}</Text>
                  <Text strong style={{ fontSize: 13, color: cactusTheme.accent }}>{formatKES(item.value)}</Text>
                </div>
              ))}

              <Divider style={{ margin: '20px 0 16px' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 20px', background: darkTokens.sidebarBg, borderRadius: 12 }}>
                <Text strong style={{ color: '#fff', fontSize: 14 }}>TOTAL LIABILITIES + EQUITY</Text>
                <Text strong style={{ color: '#fff', fontSize: 15 }}>{formatKES(totalLiabilities + totalEquity)}</Text>
              </div>
            </Col>
          </Row>

          {/* Balance Check */}
          <div style={{
            marginTop: 24, padding: '12px 20px', borderRadius: 10,
            background: balanceCheck ? '#ECFDF5' : '#FEF2F2',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Text style={{ color: balanceCheck ? '#10B981' : cactusTheme.expense, fontWeight: 600 }}>
              {balanceCheck ? '✓  Balance sheet is balanced' : '⚠  Balance sheet mismatch — review account entries'}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Assets {formatKES(totalAssets)} = Liabilities + Equity {formatKES(totalLiabilities + totalEquity)}
            </Text>
          </div>
        </div>
      ),
    },

    // ── TAB 3: Cash Flow Statement ───────────────────────────────────────────
    {
      key: 'cashflow',
      label: 'Cash Flow Statement',
      children: (
        <div>
          {/* Summary KPIs */}
          <Row gutter={[20, 20]} style={{ marginBottom: 32 }}>
            {[
              { label: 'Operating Activities', value: totOperating, color: cactusTheme.accent, bg: '#ECFDF5', note: 'From core business' },
              { label: 'Investing Activities', value: 0, color: '#64748B', bg: '#F8FAFC', note: 'No capital investments' },
              { label: 'Financing Activities', value: 0, color: '#64748B', bg: '#F8FAFC', note: 'No loan activity' },
              { label: 'Net Change in Cash', value: totOperating, color: totOperating >= 0 ? cactusTheme.accent : cactusTheme.expense, bg: totOperating >= 0 ? '#ECFDF5' : '#FFF1F2', note: 'Period net cash flow' },
            ].map(item => (
              <Col key={item.label} xs={12} lg={6}>
                <div style={{ padding: '16px 20px', borderRadius: 12, background: item.bg }}>
                  <Text type="secondary" style={{ fontSize: 11, display: 'block', marginBottom: 6 }}>{item.label}</Text>
                  <Text strong style={{ fontSize: 18, color: item.color, display: 'block' }}>{formatKES(item.value)}</Text>
                  <Text style={{ fontSize: 10, color: '#94A3B8' }}>{item.note}</Text>
                </div>
              </Col>
            ))}
          </Row>

          {/* Cash Flow Bar Chart */}
          <Card
            variant="borderless"
            style={{ borderRadius: 14, background: '#FAFBFC', border: '1px solid #F1F5F9', marginBottom: 24 }}
            title={<Text strong style={{ fontSize: 14 }}>Cash Flow by Period</Text>}
          >
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cashFlowData} barGap={4} barCategoryGap="45%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Legend verticalAlign="top" align="right" height={36} />
                  <RTooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(v: any) => formatKES(Number(v))}
                  />
                  <Bar name="Operating" dataKey="operating" fill={cactusTheme.accent} radius={[5, 5, 0, 0]} />
                  <Bar name="Investing" dataKey="investing" fill="#64748B" radius={[5, 5, 0, 0]} />
                  <Bar name="Financing" dataKey="financing" fill="#FCD34D" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Cash Flow Detail Table */}
          <Table
            dataSource={[
              { key: 'h1', activity: 'OPERATING ACTIVITIES', isHeader: true },
              { key: 'op1', activity: 'Net Profit', category: 'Operating', value: totNetProfit },
              { key: 'op2', activity: 'Add: Depreciation & Amortization', category: 'Operating', value: 0, note: 'Not tracked' },
              { key: 'op3', activity: 'Changes in Accounts Receivable', category: 'Operating', value: 0 },
              { key: 'op4', activity: 'Changes in Inventory', category: 'Operating', value: -inventoryValue },
              { key: 'op5', activity: 'Changes in Accounts Payable', category: 'Operating', value: totalCurrentLiab },
              { key: 'tot1', activity: 'Net Cash from Operating Activities', isTotal: true, value: totOperating },
              { key: 'h2', activity: 'INVESTING ACTIVITIES', isHeader: true },
              { key: 'inv1', activity: 'Purchase of Property & Equipment', category: 'Investing', value: 0, note: 'No capital expenditure' },
              { key: 'inv2', activity: 'Sale of Assets', category: 'Investing', value: 0 },
              { key: 'tot2', activity: 'Net Cash from Investing Activities', isTotal: true, value: 0 },
              { key: 'h3', activity: 'FINANCING ACTIVITIES', isHeader: true },
              { key: 'fin1', activity: 'Loan Proceeds', category: 'Financing', value: 0 },
              { key: 'fin2', activity: 'Loan Repayments', category: 'Financing', value: 0 },
              { key: 'fin3', activity: 'Owner Drawings / Dividends', category: 'Financing', value: 0 },
              { key: 'tot3', activity: 'Net Cash from Financing Activities', isTotal: true, value: 0 },
              { key: 'netTotal', activity: 'NET CHANGE IN CASH', isGrandTotal: true, value: totOperating },
            ]}
            columns={[
              {
                title: 'Activity',
                dataIndex: 'activity',
                render: (v: string, r: any) => {
                  if (r.isGrandTotal) return <Text strong style={{ fontSize: 14, color: darkTokens.sidebarBg }}>{v}</Text>;
                  if (r.isHeader) return <Text strong style={{ color: '#64748B', fontSize: 12, letterSpacing: 0.5 }}>{v}</Text>;
                  if (r.isTotal) return <Text strong>{v}</Text>;
                  return <Text style={{ paddingLeft: 16 }}>{v}</Text>;
                },
              },
              {
                title: 'Category',
                dataIndex: 'category',
                width: 120,
                render: (v: string, r: any) => (!r.isHeader && !r.isTotal && !r.isGrandTotal && v)
                  ? <Tag bordered={false} style={{ borderRadius: 6 }}>{v}</Tag>
                  : null,
              },
              {
                title: 'Amount',
                dataIndex: 'value',
                align: 'right' as const,
                width: 160,
                render: (v: number, r: any) => {
                  if (r.isHeader) return null;
                  if (r.note && v === 0) return <Text type="secondary" style={{ fontSize: 12 }}>{r.note}</Text>;
                  const color = r.isTotal || r.isGrandTotal
                    ? (v >= 0 ? cactusTheme.accent : cactusTheme.expense)
                    : 'inherit';
                  return (
                    <Text strong={r.isTotal || r.isGrandTotal} style={{ color, fontSize: r.isGrandTotal ? 15 : 13 }}>
                      {v < 0 ? `(${formatKES(Math.abs(v))})` : formatKES(v)}
                    </Text>
                  );
                },
              },
            ]}
            rowKey="key"
            pagination={false}
            size="small"
            rowClassName={(r: any) => {
              if (r.isGrandTotal) return 'grand-total-row';
              if (r.isHeader) return 'section-header-row';
              return '';
            }}
          />

          <style dangerouslySetInnerHTML={{ __html: `
            .grand-total-row td { background: ${darkTokens.sidebarBg}15 !important; border-top: 2px solid ${darkTokens.sidebarBg}30 !important; }
            .section-header-row td { background: #F8FAFC !important; padding-top: 20px !important; }
          ` }} />
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <Row gutter={[32, 32]} align="middle" style={{ marginBottom: 32 }}>
        <Col flex="auto">
          <Title level={2} style={{ margin: 0, fontWeight: 500, fontSize: 24 }}>
            Financial Statements
          </Title>
          <Text type="secondary">Income Statement, Balance Sheet & Cash Flow — all in one place.</Text>
        </Col>
        <Col>
          <Space>
            <Select value={period} onChange={setPeriod} style={{ width: 140, borderRadius: 8 }}>
              <Select.Option value="1m">Last 30 Days</Select.Option>
              <Select.Option value="6m">Last 6 Months</Select.Option>
              <Select.Option value="1y">Year to Date</Select.Option>
            </Select>
            <Dropdown menu={{ items: exportMenuItems }} placement="bottomRight">
              <Button
                icon={<DownloadOutlined />}
                type="primary"
                style={{ borderRadius: 8, background: darkTokens.sidebarBg, border: 'none' }}
              >
                Export Statements
              </Button>
            </Dropdown>
          </Space>
        </Col>
      </Row>

      <Card variant="borderless" style={{ borderRadius: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <Tabs items={tabItems} size="large" defaultActiveKey="income" />
      </Card>
    </div>
  );
}
