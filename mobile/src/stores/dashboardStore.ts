import { create } from 'zustand';
import { SaleRepo, type DailySummary, type DailyRevenue } from '@db/repositories/SaleRepo';
import { ProductRepo } from '@db/repositories/ProductRepo';
import { SyncQueueRepo } from '@db/repositories/SyncQueueRepo';
import { generateInsights } from '@utils/helpers';

interface DashboardState {
  summary: DailySummary | null;
  weeklyRevenue: DailyRevenue[];
  lowStockCount: number;
  pendingSyncCount: number;
  insights: string[];
  isLoading: boolean;
  lastRefreshed: number;

  refresh: (businessId: string) => Promise<void>;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  summary: null,
  weeklyRevenue: [],
  lowStockCount: 0,
  pendingSyncCount: 0,
  insights: [],
  isLoading: false,
  lastRefreshed: 0,

  async refresh(businessId) {
    set({ isLoading: true });

    try {
      const [summary, weeklyRevenue, lowStockProducts, pendingSyncCount] = await Promise.all([
        SaleRepo.getDailySummary(businessId, Date.now()),
        SaleRepo.getWeeklySummary(businessId),
        ProductRepo.findLowStock(businessId),
        SyncQueueRepo.getPendingCount(),
      ]);

      const insights = generateInsights(summary);

      set({
        summary,
        weeklyRevenue,
        lowStockCount: lowStockProducts.length,
        pendingSyncCount,
        insights,
        lastRefreshed: Date.now(),
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
