import { Agent01State, Agent03State, EconomicCalendarEvent, GoldBias, NewsHeadline, NewsRisk } from '../types.js';

export interface MacroData {
  gold_bias: GoldBias;
  macro_score: number;
  confidence: number;
  news_risk: NewsRisk;
  us10y_yield: number;
  dxy_index: number;
  fed_policy: string;
  geopolitical_risk: string;
  upcoming_events: Array<{ title: string; impact: string; time_until: string }>;
  headlines: NewsHeadline[];
  calendar_events: EconomicCalendarEvent[];
  blackout_active: boolean;
  active_blackout_event?: string;
}

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

export function getStructuredEconomicCalendar(): EconomicCalendarEvent[] {
  const now = new Date();
  const nowMs = now.getTime();

  // Scheduled events relative to current time
  const rawEvents = [
    {
      id: 'cal_cpi_01',
      title: 'US Core CPI Inflation (MoM)',
      country: 'USD',
      impact: 'HIGH' as const,
      offsetMinutes: 135, // 2h 15m
      forecast: '0.3%',
      previous: '0.4%',
      actual: undefined,
      blackoutWindowMinutes: 15
    },
    {
      id: 'cal_fomc_02',
      title: 'FOMC Rate Decision & Press Conference',
      country: 'USD',
      impact: 'CRITICAL' as const,
      offsetMinutes: 1680, // 1d 4h
      forecast: '5.25%',
      previous: '5.25%',
      actual: undefined,
      blackoutWindowMinutes: 30
    },
    {
      id: 'cal_nfp_03',
      title: 'US Non-Farm Payrolls (NFP) & Unemployment Rate',
      country: 'USD',
      impact: 'CRITICAL' as const,
      offsetMinutes: -45, // released 45m ago
      forecast: '180K',
      previous: '175K',
      actual: '216K',
      blackoutWindowMinutes: 30
    },
    {
      id: 'cal_ppi_04',
      title: 'US Producer Price Index (PPI MoM)',
      country: 'USD',
      impact: 'MEDIUM' as const,
      offsetMinutes: 320,
      forecast: '0.2%',
      previous: '0.1%',
      actual: undefined,
      blackoutWindowMinutes: 10
    },
    {
      id: 'cal_jobless_05',
      title: 'Initial Jobless Claims',
      country: 'USD',
      impact: 'MEDIUM' as const,
      offsetMinutes: 720,
      forecast: '215K',
      previous: '220K',
      actual: undefined,
      blackoutWindowMinutes: 10
    }
  ];

  return rawEvents.map(evt => {
    const eventTime = new Date(nowMs + evt.offsetMinutes * 60000);
    const timeUntilMinutes = Math.round((eventTime.getTime() - nowMs) / 60000);
    const absDiff = Math.abs(timeUntilMinutes);
    const blackoutActive = (evt.impact === 'CRITICAL' || evt.impact === 'HIGH') && absDiff <= evt.blackoutWindowMinutes;

    return {
      id: evt.id,
      title: evt.title,
      country: evt.country,
      impact: evt.impact,
      scheduled_time: eventTime.toISOString(),
      time_until_minutes: timeUntilMinutes,
      actual: evt.actual,
      forecast: evt.forecast,
      previous: evt.previous,
      blackout_active: blackoutActive,
      blackout_window_minutes: evt.blackoutWindowMinutes
    };
  });
}

export async function fetchMacroData(): Promise<MacroData> {
  const headlines = getSampleHeadlines();
  const calendarEvents = getStructuredEconomicCalendar();

  const totalImpact = headlines.reduce((sum, h) => sum + h.impact_score, 0);

  let gold_bias: GoldBias = 'NEUTRAL';
  if (totalImpact >= 5) gold_bias = 'BULLISH';
  else if (totalImpact <= -5) gold_bias = 'BEARISH';

  const macro_score = Math.min(100, Math.max(0, 50 + totalImpact * 3));

  // Evaluate blackout windows
  const activeBlackout = calendarEvents.find(e => e.blackout_active);
  let news_risk: NewsRisk = 'LOW';

  if (activeBlackout) {
    news_risk = 'EXTREME';
  } else {
    const hasHighUpcoming = calendarEvents.some(e => (e.impact === 'HIGH' || e.impact === 'CRITICAL') && e.time_until_minutes > 0 && e.time_until_minutes <= 120);
    if (hasHighUpcoming) news_risk = 'HIGH';
    else if (totalImpact > 10 || totalImpact < -10) news_risk = 'MEDIUM';
  }

  let us10y_yield = 4.64;
  let dxy_index = 99.76;

  try {
    const resTnx = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/^TNX', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3000)
    });
    if (resTnx.ok) {
      const data = await resTnx.json();
      const val = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof val === 'number' && val > 0) {
        us10y_yield = Number(val.toFixed(2));
      }
    }
  } catch {
    // Keep baseline default
  }

  try {
    const resDxy = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/DX-Y.NYB', {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(3000)
    });
    if (resDxy.ok) {
      const data = await resDxy.json();
      const val = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
      if (typeof val === 'number' && val > 0) {
        dxy_index = Number(val.toFixed(2));
      }
    }
  } catch {
    // Keep baseline default
  }

  const upcoming_events = calendarEvents
    .filter(e => e.time_until_minutes > 0)
    .slice(0, 3)
    .map(e => {
      const hrs = Math.floor(e.time_until_minutes / 60);
      const mins = Math.abs(e.time_until_minutes % 60);
      const time_until = hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
      return { title: e.title, impact: e.impact, time_until };
    });

  return {
    gold_bias,
    macro_score,
    confidence: 78,
    news_risk,
    us10y_yield,
    dxy_index,
    fed_policy: 'Hawkish Pause / Rate Cut Data-Dependent',
    geopolitical_risk: 'ELEVATED_SAFE_HAVEN_DEMAND',
    upcoming_events,
    headlines,
    calendar_events: calendarEvents,
    blackout_active: Boolean(activeBlackout),
    active_blackout_event: activeBlackout?.title
  };
}

export async function fetchAgent03State(): Promise<Agent03State> {
  const data = await fetchMacroData();
  return {
    agent: 'Agent03',
    version: '1.0',
    generated_at: new Date().toISOString(),
    status: 'SUCCESS',
    data: {
      gold_bias: data.gold_bias,
      macro_score: data.macro_score,
      confidence: data.confidence,
      news_risk: data.news_risk,
      headlines: data.headlines,
      calendar_events: data.calendar_events,
      blackout_active: data.blackout_active,
      active_blackout_event: data.active_blackout_event,
      us10y_yield: data.us10y_yield,
      dxy_index: data.dxy_index
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


