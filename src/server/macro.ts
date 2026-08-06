import { Agent01State, Agent03State, GoldBias, NewsHeadline, NewsRisk } from '../types.js';

export function getSampleHeadlines(): NewsHeadline[] {
  const now = new Date();
  return [
    {
      title: 'Federal Reserve Signals Caution on Interest Rate Cuts Amid Inflation Persistence',
      pubDate: new Date(now.getTime() - 15 * 60000).toUTCString(),
      source: 'Federal Reserve Press Release',
      impact_score: -4,
      bias: 'BEARISH'
    },
    {
      title: 'US Treasury Yields Soften as Middle East Geopolitical Safe-Haven Demand Rises',
      pubDate: new Date(now.getTime() - 45 * 60000).toUTCString(),
      source: 'Federal Reserve Economic Data',
      impact_score: 8,
      bias: 'BULLISH'
    },
    {
      title: 'FOMC Statement Highlights Balanced Employment and Inflation Risk Outlook',
      pubDate: new Date(now.getTime() - 120 * 60000).toUTCString(),
      source: 'Federal Reserve RSS',
      impact_score: 3,
      bias: 'BULLISH'
    },
    {
      title: 'Global Central Bank Gold Purchases Surge 12% Month-over-Month',
      pubDate: new Date(now.getTime() - 240 * 60000).toUTCString(),
      source: 'World Gold Council / Macro Intelligence',
      impact_score: 7,
      bias: 'BULLISH'
    }
  ];
}

export async function fetchAgent03State(): Promise<Agent03State> {
  const headlines = getSampleHeadlines();
  const totalImpact = headlines.reduce((sum, h) => sum + h.impact_score, 0);

  let gold_bias: GoldBias = 'NEUTRAL';
  if (totalImpact >= 5) gold_bias = 'BULLISH';
  else if (totalImpact <= -5) gold_bias = 'BEARISH';

  // Calculate score between 0 and 100
  const macro_score = Math.min(100, Math.max(0, 50 + totalImpact * 3));
  
  // RSS news risk: LOW, MEDIUM, or HIGH
  const news_risk: NewsRisk = 'LOW';

  return {
    agent: 'Agent03',
    version: '0.3',
    generated_at: new Date().toISOString(),
    status: 'SUCCESS',
    data: {
      gold_bias,
      macro_score,
      confidence: 78,
      news_risk,
      headlines
    }
  };
}

export function fetchAgent01State(): Agent01State {
  return {
    agent: 'Agent01',
    version: '0.3',
    generated_at: new Date().toISOString(),
    status: 'SUCCESS',
    data: {
      gold_bias: 'BULLISH',
      usd_bias: 'BEARISH',
      confidence: 74,
      news_risk: 'LOW'
    }
  };
}
