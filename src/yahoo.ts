import type { Candle, YahooData, YahooFundamentals } from './types';

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

type YahooQuote = {
  quoteResponse?: {
    result?: Array<{
      marketCap?: number;
      trailingPE?: number;
      priceToBook?: number;
      trailingEps?: number;
      dividendYield?: number;
      bookValue?: number;
      debtToEquity?: number;
      returnOnEquity?: number;
      beta?: number;
      faceValue?: number;
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
    const values = [quote.open?.[i], quote.high?.[i], quote.low?.[i], quote.close?.[i], quote.volume?.[i]];
    if (values.every(finite)) {
      candles.push({
        time: timestamps[i],
        open: quote.open![i]!,
        high: quote.high![i]!,
        low: quote.low![i]!,
        close: quote.close![i]!,
        volume: quote.volume![i]!,
      });
    }
  }

  return candles;
}


function aggregateHourlyToDaily(candles: Candle[]): Candle[] {
  const days = new Map<string, Candle>();

  for (const candle of candles) {
    const day = new Date(candle.time * 1000).toLocaleDateString('en-CA', {
      timeZone: 'Asia/Kolkata',
    });
    const existing = days.get(day);

    if (!existing) {
      days.set(day, { ...candle });
      continue;
    }

    existing.high = Math.max(existing.high, candle.high);
    existing.low = Math.min(existing.low, candle.low);
    existing.close = candle.close;
    existing.volume += candle.volume;
  }

  return [...days.values()].sort((a, b) => a.time - b.time);
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

async function fetchQuote(symbol: string): Promise<YahooFundamentals> {
  const encoded = encodeURIComponent(symbol);
  const response = await fetch(`/yahoo/v7/finance/quote?symbols=${encoded}`);
  if (!response.ok) return emptyFundamentals();

  const json = (await response.json()) as YahooQuote;
  const quote = json.quoteResponse?.result?.[0];
  if (!quote) return emptyFundamentals();

  return {
    marketCap: finite(quote.marketCap) ? quote.marketCap : NaN,
    trailingPE: finite(quote.trailingPE) ? quote.trailingPE : NaN,
    priceToBook: finite(quote.priceToBook) ? quote.priceToBook : NaN,
    trailingEPS: finite(quote.trailingEps) ? quote.trailingEps : NaN,
    dividendYield: finite(quote.dividendYield) ? quote.dividendYield * 100 : NaN,
    bookValue: finite(quote.bookValue) ? quote.bookValue : NaN,
    debtToEquity: finite(quote.debtToEquity) ? quote.debtToEquity / 100 : NaN,
    returnOnEquity: finite(quote.returnOnEquity) ? quote.returnOnEquity * 100 : NaN,
    beta: finite(quote.beta) ? quote.beta : NaN,
    industryPE: NaN,
    faceValue: finite(quote.faceValue) ? quote.faceValue : NaN,
  };
}

function emptyFundamentals(): YahooFundamentals {
  return {
    marketCap: NaN,
    trailingPE: NaN,
    priceToBook: NaN,
    trailingEPS: NaN,
    dividendYield: NaN,
    bookValue: NaN,
    debtToEquity: NaN,
    returnOnEquity: NaN,
    beta: NaN,
    industryPE: NaN,
    faceValue: NaN,
  };
}

export async function loadYahoo(symbol: string): Promise<YahooData> {
  const normalized = symbol.toUpperCase().endsWith('.NS')
    ? symbol.toUpperCase()
    : `${symbol.toUpperCase()}.NS`;

  // The original calculator used these hourly candles. Keep them intact.
  const hourly = await fetchChart(normalized, '1y', '60m');

  // Daily technicals are derived from the same 1-year hourly Yahoo dataset.
  // This keeps every displayed technical value tied to the exact source response
  // used by the original calculator instead of silently switching datasets.
  const dailyCandles = aggregateHourlyToDaily(hourly.candles);

  const meta = hourly.result.meta ?? {};
  const lastHourly = hourly.candles.at(-1);
  const lastDaily = dailyCandles.at(-1);

  if (!lastHourly || !lastDaily) throw new Error(`Not enough Yahoo data for ${normalized}`);
  if (hourly.candles.length < 200) throw new Error(`Not enough hourly history: ${hourly.candles.length} candles`);
  if (dailyCandles.length < 200) throw new Error(`Not enough daily history after aggregation: ${dailyCandles.length} candles`);

  const fundamentals = await fetchQuote(normalized);

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
    fundamentals,
  };
}
