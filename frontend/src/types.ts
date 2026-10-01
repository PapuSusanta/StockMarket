export type PivotLevels = {
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
};

export type TechnicalSet = {
  sma10: number; sma20: number; sma50: number; sma100: number; sma200: number;
  ema10: number; ema20: number; ema50: number; ema100: number; ema200: number;
  rsi14: number; atr14: number; atrPercent: number;
  macd: number; macdLine: number; macdSignal: number;
  avgVolume20: number; volumeRatio: number; pivots: PivotLevels;
};

export type Analysis = {
  symbol: string; name: string; price: number; changePercent: number;
  dayHigh: number; dayLow: number; week52High: number; week52Low: number;
  open: number; previousClose: number; liveVolume: number;
  quoteTime: number; quoteTimeSource: 'quote' | 'hourly candle';
  support: number; resistance: number; target: number; stopLoss: number;
  riskReward: number; upsidePercent: number;
  legacySma20: number; legacySma50: number; legacySma200: number;
  legacyEma20: number; legacyEma50: number; legacyEma200: number;
  legacyRsi14: number; legacyMacd: number; legacyMacdSignal: number;
  legacyAtr14: number; legacyAtrPercent: number;
  legacyAvgVolume20: number; legacyVolumeRatio: number;
  daily: TechnicalSet;
};
