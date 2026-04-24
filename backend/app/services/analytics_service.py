from datetime import datetime, timezone
from typing import Any, Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, text, and_, case

from ..models.sale import Sale, SaleItem
from ..models.product import Product

class AnalyticsService:
    DAY_MS = 24 * 60 * 60 * 1000

    @staticmethod
    def get_now_ms():
        return int(datetime.now(timezone.utc).timestamp() * 1000)

    async def get_daily_summary(self, db: AsyncSession, business_id: str, date_str: str | None = None) -> Dict[str, Any]:
        target_date = datetime.strptime(date_str, "%Y-%m-%d") if date_str else datetime.now(timezone.utc)
        start = int(datetime(target_date.year, target_date.month, target_date.day, 0, 0, 0, tzinfo=timezone.utc).timestamp() * 1000)
        end = start + self.DAY_MS - 1

        # Revenue Breakdown
        revenue_row = await db.execute(
            select(
                func.coalesce(func.sum(Sale.total_amount), 0).label("total_revenue"),
                func.count(Sale.id).label("total_transactions"),
                func.coalesce(func.sum(
                    case((Sale.payment_method == "cash", Sale.total_amount), else_=0)
                ), 0).label("cash_revenue"),
                func.coalesce(func.sum(
                    case((Sale.payment_method == "mpesa", Sale.total_amount), else_=0)
                ), 0).label("mpesa_revenue"),
                func.coalesce(func.sum(
                    case((Sale.payment_method == "bank", Sale.total_amount), else_=0)
                ), 0).label("bank_revenue"),
            ).where(and_(
                Sale.business_id == business_id,
                Sale.created_at >= start,
                Sale.created_at <= end,
            ))
        )
        revenue = revenue_row.one()

        # Cost Analysis
        cost_row = await db.execute(
            select(func.coalesce(func.sum(SaleItem.quantity * SaleItem.cost_price), 0).label("total_cost"))
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(and_(Sale.business_id == business_id, Sale.created_at >= start, Sale.created_at <= end))
        )
        total_cost = cost_row.scalar() or 0

        # Top Products
        top_products_q = await db.execute(
            select(
                SaleItem.product_id,
                SaleItem.product_name,
                func.sum(SaleItem.quantity).label("total_qty"),
                func.sum(SaleItem.subtotal).label("total_revenue"),
            )
            .join(Sale, Sale.id == SaleItem.sale_id)
            .where(and_(Sale.business_id == business_id, Sale.created_at >= start, Sale.created_at <= end))
            .group_by(SaleItem.product_id, SaleItem.product_name)
            .order_by(func.sum(SaleItem.subtotal).desc())
            .limit(10)
        )
        top = [dict(r._mapping) for r in top_products_q]

        total_revenue = float(revenue.total_revenue)
        gross_profit = total_revenue - float(total_cost)
        profit_margin = (gross_profit / total_revenue * 100) if total_revenue > 0 else 0

        insights = self._generate_insights(total_revenue, gross_profit, profit_margin, revenue.total_transactions, top)

        return {
            "date": target_date.strftime("%Y-%m-%d"),
            "total_revenue": total_revenue,
            "total_cost": float(total_cost),
            "gross_profit": gross_profit,
            "profit_margin": round(profit_margin, 1),
            "total_transactions": revenue.total_transactions,
            "cash_revenue": float(revenue.cash_revenue),
            "mpesa_revenue": float(revenue.mpesa_revenue),
            "bank_revenue": float(revenue.bank_revenue),
            "top_products": top,
            "avg_order_value": round(total_revenue / revenue.total_transactions) if revenue.total_transactions > 0 else 0,
            "insights": insights,
        }

    async def get_weekly_revenue(self, db: AsyncSession, business_id: str) -> List[Dict[str, Any]]:
        seven_days_ago = self.get_now_ms() - 7 * self.DAY_MS
        rows = await db.execute(
            text("""
                SELECT
                  to_char(to_timestamp(created_at / 1000), 'YYYY-MM-DD') AS date,
                  COALESCE(SUM(total_amount), 0)                          AS revenue,
                  COUNT(*)                                                  AS transactions
                FROM sales
                WHERE business_id = :business_id AND created_at >= :since
                GROUP BY date
                ORDER BY date ASC
            """),
            {"business_id": business_id, "since": seven_days_ago},
        )
        return [dict(r._mapping) for r in rows]

    async def detect_anomalies(self, db: AsyncSession, business_id: str) -> Dict[str, Any]:
        """Detect potential stock loss based on inventory vs sales."""
        rows = await db.execute(
            text("""
                WITH sold AS (
                    SELECT si.product_id, SUM(si.quantity) AS total_sold
                    FROM sale_items si
                    JOIN sales s ON s.id = si.sale_id
                    WHERE s.business_id = :business_id
                    GROUP BY si.product_id
                ),
                restocked AS (
                    SELECT product_id, SUM(quantity_change) AS total_restocked
                    FROM inventory_movements
                    WHERE business_id = :business_id AND movement_type = 'restock'
                    GROUP BY product_id
                )
                SELECT
                    p.id, p.name, p.stock_quantity AS current_stock,
                    COALESCE(s.total_sold, 0)       AS total_sold,
                    COALESCE(r.total_restocked, 0)  AS total_restocked,
                    COALESCE(r.total_restocked, 0) - COALESCE(s.total_sold, 0) - p.stock_quantity AS potential_loss
                FROM products p
                LEFT JOIN sold s ON s.product_id = p.id
                LEFT JOIN restocked r ON r.product_id = p.id
                WHERE p.business_id = :business_id AND p.is_active = TRUE
                  AND COALESCE(r.total_restocked, 0) - COALESCE(s.total_sold, 0) - p.stock_quantity > 0
                ORDER BY potential_loss DESC
            """),
            {"business_id": business_id},
        )
        anomalies = [dict(r._mapping) for r in rows]
        insights = [f"Possible loss on {a['name']}: {a['potential_loss']} units missing." for a in anomalies[:3]]
        return {"anomalies": anomalies, "insights": insights}

    def _generate_insights(self, revenue: float, profit: float, margin: float, transactions: int, top_products: list) -> List[str]:
        insights = []
        if revenue == 0: return ["No sales recorded today."]
        insights.append(f"Revenue today: KSh {revenue:,.0f}.")
        if profit > 0: insights.append(f"Est. Profit: KSh {profit:,.0f} ({margin:.1f}% margin).")
        if top_products:
            top = top_products[0]
            share = (top["total_revenue"] / revenue * 100) if revenue > 0 else 0
            insights.append(f"{top['product_name']} is {share:.0f}% of today's revenue.")
        if transactions >= 30: insights.append(f"High activity: {transactions} completed transactions.")
        return insights

analytics_service = AnalyticsService()
