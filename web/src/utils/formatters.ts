export function formatKES(amount: number | undefined | null): string {
  if (amount === undefined || amount === null) return 'KSh 0';
  return `KSh ${amount.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatPercent(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatDate(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

export function formatDateTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleString('en-KE', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
}

export function generateInsights(data: {
  total_revenue: number;
  gross_profit: number;
  profit_margin: number;
  total_transactions: number;
  top_products: Array<{ product_name: string; total_revenue: number }>;
  cash_revenue: number;
  mpesa_revenue: number;
}): string[] {
  if (data.total_revenue === 0) return ['No sales recorded today yet.'];
  const out: string[] = [];
  out.push(`You made ${formatKES(data.total_revenue)} today.`);
  if (data.gross_profit > 0)
    out.push(`Estimated profit: ${formatKES(data.gross_profit)} (${formatPercent(data.profit_margin)} margin).`);
  if (data.top_products.length > 0) {
    const top = data.top_products[0];
    const share = data.total_revenue > 0 ? (top.total_revenue / data.total_revenue) * 100 : 0;
    out.push(`${top.product_name} accounts for ${formatPercent(share, 0)} of today's revenue.`);
  }
  if (data.mpesa_revenue > data.cash_revenue)
    out.push('Most customers are paying via M-Pesa today.');
  return out;
}
