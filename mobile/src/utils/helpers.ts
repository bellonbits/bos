import 'react-native-get-random-values'; // polyfill required before uuid import
import { v4 as uuidv4 } from 'uuid';

export function generateId(): string {
  return uuidv4();
}

export function nowMs(): number {
  return Date.now();
}

export function formatKES(amount: number): string {
  return `KSh ${amount.toLocaleString('en-KE', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatDate(timestampMs: number): string {
  return new Date(timestampMs).toLocaleDateString('en-KE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(timestampMs: number): string {
  return new Date(timestampMs).toLocaleTimeString('en-KE', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function startOfDay(date = new Date()): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function endOfDay(date = new Date()): number {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function generateInsights(summary: {
  total_revenue: number;
  gross_profit: number;
  profit_margin: number;
  total_transactions: number;
  top_products: Array<{ product_name: string; total_revenue: number }>;
  cash_revenue: number;
  mpesa_revenue: number;
}): string[] {
  const insights: string[] = [];

  if (summary.total_revenue === 0) {
    insights.push('No sales recorded today yet. Tap POS to make your first sale.');
    return insights;
  }

  insights.push(`You made ${formatKES(summary.total_revenue)} today.`);

  if (summary.gross_profit > 0) {
    insights.push(
      `Estimated profit: ${formatKES(summary.gross_profit)} (${formatPercent(summary.profit_margin)} margin).`
    );
  }

  if (summary.top_products.length > 0) {
    const top = summary.top_products[0];
    const topShare = summary.total_revenue > 0
      ? (top.total_revenue / summary.total_revenue) * 100
      : 0;
    insights.push(`${top.product_name} is your top seller — ${formatPercent(topShare)} of revenue.`);
  }

  if (summary.mpesa_revenue > summary.cash_revenue) {
    insights.push('Most customers are paying via M-Pesa today.');
  } else if (summary.cash_revenue > summary.mpesa_revenue) {
    insights.push('Most customers are paying cash today.');
  }

  if (summary.total_transactions >= 20) {
    insights.push(`Busy day! ${summary.total_transactions} transactions so far.`);
  }

  return insights;
}
