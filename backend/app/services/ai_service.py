import os
from datetime import datetime, timezone
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from groq import Groq
from ..config import get_settings
from ..services.analytics_service import analytics_service

class AIService:
    def __init__(self):
        settings = get_settings()
        self.api_key = settings.groq_api_key or os.environ.get("GROQ_API_KEY", "")
        self.model = settings.groq_model
        
        # Don't initialize client at import time to avoid crashing if key is missing when running CLI commands
        self._client = None

    @property
    def client(self):
        if not self._client and self.api_key:
            self._client = Groq(api_key=self.api_key)
        return self._client

    async def generate_business_insights(self, db: AsyncSession, business_id: str) -> Dict[str, Any]:
        """
        Gathers recent business analytics and passes them into Groq LLM to generate
        short, highly actionable performance insights.
        """
        # Gather data context for the prompt
        today_date = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        daily_stats = await analytics_service.get_daily_summary(db, business_id, today_date)
        
        revenue = daily_stats.get('total_revenue', 0)
        profit = daily_stats.get('gross_profit', 0)
        margin = daily_stats.get('profit_margin', 0)
        transactions = daily_stats.get('total_transactions', 0)
        top_products = [p['product_name'] for p in daily_stats.get('top_products', [])[:3]]
        
        # Build prompt context
        prompt = (
            f"You are Biashara OS's expert AI business analyst. The user owns a local business in Kenya. "
            f"Here are their stats for today ({today_date}):\n"
            f"- Output Revenue: KSh {revenue}\n"
            f"- Estimated Gross Profit: KSh {profit}\n"
            f"- Profit Margin: {margin}%\n"
            f"- Number of Transactions: {transactions}\n"
            f"- Top Selling Products Today: {', '.join(top_products) if top_products else 'None recorded yet'}.\n\n"
            f"Write exactly 3 distinct, very brief, snappy, and encouraging business insights or advice based strictly on this data. "
            f"Do not write any intro/outro like 'Here are your insights'. Output only the 3 points formatted as bullet points."
        )

        try:
            if not self.client:
                return {"insights": ["AI is currently offline or unconfigured."], "raw": ""}

            chat_completion = self.client.chat.completions.create(
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
                model=self.model,
                temperature=0.6,
                max_tokens=150,
            )
            
            raw_content = chat_completion.choices[0].message.content
            
            # Clean up the output to return an array of strings
            insights_lines = [line.strip().lstrip('-').lstrip('*').strip() for line in raw_content.split('\n') if line.strip()]
            
            return {
                "insights": insights_lines,
                "raw": raw_content
            }
        except Exception as e:
            # Fallback if Groq API fails
            print(f"Groq API Error: {str(e)}")
            return {"insights": ["Unable to fetch live AI insights at the moment."], "error": str(e)}

ai_service = AIService()
