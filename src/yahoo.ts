import type { Candle, YahooData } from './types';

type YahooChart = {
  chart?: {
    result?: Array<{
      meta?: {
        longName?: string;
        shortName?: string;
        regularMarketPrice?: number;
        regularMarketChangePercent?: number;
        regularMarketDayHigh?: number;
        regularMarketDayLow?: number;
        regularMarketVolume?: number;
        regularMarketOpen?: number;
        previousClose?: number;
        fiftyTwoWeekHigh?: number;
        fiftyTwoWeekLow?: number;
      };
      timestamp?: number[];
      indicators?: {
        quote?: Array<{
          open?: Array<number | null>;
          high?: Array<number | null>;
          low?: Array<number | null>;
          close?: Array<number | null>;
          volume?: Array<number | null>;
        }>;
      };
    }>;
  };
};

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

function parseCandles(result: NonNullable<NonNullable<YahooChart['chart']>['result']>[number]) {
  const quote = result.indicators?.quote?.[0] ?? {};
  const timestamps = result.timestamp ?? [];
  const candles: Candle[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    const open = quote.open?.[i];
    const high = quote.high?.[i];
    const low = quote.low?.[i];
    const close = quote.close?.[i];
    const volume = quote.volume?.[i];
    if (!finite(timestamps[i]) || !finite(open) || !finite(high) || !finite(low) || !finite(close)) continue;

    // A missing volume value should not discard an otherwise valid price bar.
    candles.push({
      time: timestamps[i],
      open,
      high,
      low,
      close,
      volume: finite(volume) ? volume : 0,
    });
  }

  return candles;
}


async function fetchChart(symbol: string, range: '1y' | '2y', interval: '60m' | '1d') {
  const encoded = encodeURIComponent(symbol);
  const url = `/yahoo/v8/finance/chart/${encoded}?range=${range}&interval=${interval}&events=history`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Yahoo Finance request failed (${response.status})`);
  const json = (await response.json()) as YahooChart;
  const result = json.chart?.result?.[0];
  if (!result) throw new Error(`No Yahoo ${interval} data found for ${symbol}`);
  return { result, candles: parseCandles(result) };
}

export function normalizeYahooSymbol(input: string): string {
  const raw = input.trim().toUpperCase();
  if (!raw) throw new Error('Enter a stock symbol');
  const exchange = /^(NSE|BSE):/.exec(raw)?.[1];
  const symbol = raw.replace(/^(NSE|BSE):/, '');
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return symbol;
  return `${symbol}.${exchange === 'BSE' ? 'BO' : 'NS'}`;
}

export async function loadYahoo(symbol: string): Promise<YahooData> {
  const normalized = normalizeYahooSymbol(symbol);

  // Keep hourly data for the original intraday metrics; use actual daily bars
  // for daily indicators, pivots, and daily volume.
  const [hourly, daily] = await Promise.all([
    fetchChart(normalized, '1y', '60m'),
    fetchChart(normalized, '2y', '1d'),
  ]);
  const dailyCandles = daily.candles;

  const meta = hourly.result.meta ?? {};
  const lastHourly = hourly.candles.at(-1);
  const lastDaily = dailyCandles.at(-1);

  if (!lastHourly || !lastDaily) throw new Error(`No usable Yahoo price history found for ${normalized}`);

  return {
    name: meta.longName ?? meta.shortName ?? normalized,
    price: meta.regularMarketPrice ?? lastHourly.close,
    changePercent: meta.regularMarketChangePercent ?? 0,
    dayHigh: meta.regularMarketDayHigh ?? lastHourly.high,
    dayLow: meta.regularMarketDayLow ?? lastHourly.low,
    week52High: meta.fiftyTwoWeekHigh ?? Math.max(...dailyCandles.slice(-252).map((x) => x.high)),
    week52Low: meta.fiftyTwoWeekLow ?? Math.min(...dailyCandles.slice(-252).map((x) => x.low)),
    open: meta.regularMarketOpen ?? lastHourly.open,
    previousClose: meta.previousClose ?? dailyCandles.at(-2)?.close ?? lastDaily.close,
    liveVolume: meta.regularMarketVolume ?? lastHourly.volume,
    candles: hourly.candles,
    dailyCandles,
  };
}
