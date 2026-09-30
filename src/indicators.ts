import type { Candle, PivotLevels, TechnicalSet } from './types';

const average = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : NaN;

export const sma = (values: number[], period: number) =>
  values.length < period ? NaN : average(values.slice(-period));

export function ema(values: number[], period: number) {
  if (values.length < period) return NaN;
  const multiplier = 2 / (period + 1);
  let result = average(values.slice(0, period));
  for (let i = period; i < values.length; i++) {
    result = values[i] * multiplier + result * (1 - multiplier);
  }
  return result;
}

function emaSeries(values: number[], period: number) {
  const result = Array<number>(values.length).fill(NaN);
  if (values.length < period) return result;
  const multiplier = 2 / (period + 1);
  let current = average(values.slice(0, period));
  result[period - 1] = current;
  for (let i = period; i < values.length; i++) {
    current = values[i] * multiplier + current * (1 - multiplier);
    result[i] = current;
  }
  return result;
}

export function rsi(values: number[], period = 14) {
  if (values.length <= period) return NaN;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= period; i++) {
    const change = values[i] - values[i - 1];
    gain += Math.max(change, 0);
    loss += Math.max(-change, 0);
  }
  let averageGain = gain / period;
  let averageLoss = loss / period;
  for (let i = period + 1; i < values.length; i++) {
    const change = values[i] - values[i - 1];
    averageGain = (averageGain * (period - 1) + Math.max(change, 0)) / period;
    averageLoss = (averageLoss * (period - 1) + Math.max(-change, 0)) / period;
  }
  if (averageLoss === 0) return 100;
  return 100 - 100 / (1 + averageGain / averageLoss);
}

export function atr(candles: Candle[], period = 14) {
  if (candles.length <= period) return NaN;
  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const previous = candles[i - 1];
    trueRanges.push(
      Math.max(
        current.high - current.low,
        Math.abs(current.high - previous.close),
        Math.abs(current.low - previous.close),
      ),
    );
  }
  let value = average(trueRanges.slice(0, period));
  for (let i = period; i < trueRanges.length; i++) {
    value = (value * (period - 1) + trueRanges[i]) / period;
  }
  return value;
}

export function macd(values: number[]) {
  const fast = emaSeries(values, 12);
  const slow = emaSeries(values, 26);
  const lineSeries: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (Number.isFinite(fast[i]) && Number.isFinite(slow[i])) {
      lineSeries.push(fast[i] - slow[i]);
    }
  }
  const signalSeries = emaSeries(lineSeries, 9);
  const line = lineSeries.at(-1) ?? NaN;
  const signal = signalSeries.at(-1) ?? NaN;

  return {
    line,
    signal,
    histogram: Number.isFinite(line) && Number.isFinite(signal) ? line - signal : NaN,
  };
}

export function classicPivots(candles: Candle[]): PivotLevels {
  if (candles.length < 2) {
    return { pivot: NaN, r1: NaN, r2: NaN, r3: NaN, s1: NaN, s2: NaN, s3: NaN };
  }
  const previous = candles[candles.length - 2];
  const { high, low, close } = previous;
  const pivot = (high + low + close) / 3;
  const range = high - low;
  return {
    pivot,
    r1: 2 * pivot - low,
    r2: pivot + range,
    r3: high + 2 * (pivot - low),
    s1: 2 * pivot - high,
    s2: pivot - range,
    s3: low - 2 * (high - pivot),
  };
}

/** The original calculator's indicator set. Kept unchanged in formula/periods. */
export function calculate(candles: Candle[]) {
  const closes = candles.map((candle) => candle.close);
  const volumes = candles.map((candle) => candle.volume);
  const price = closes.at(-1)!;
  const atr14 = atr(candles, 14);
  const macdValue = macd(closes);
  const avgVolume20 = sma(volumes, 20);

  return {
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    sma200: sma(closes, 200),
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    ema200: ema(closes, 200),
    rsi14: rsi(closes, 14),
    atr14,
    atrPercent: (atr14 / price) * 100,
    macd: macdValue.line,
    macdSignal: macdValue.signal,
    avgVolume20,
    volumeRatio: volumes.at(-1)! / avgVolume20,
  };
}

export function calculateDaily(candles: Candle[]): TechnicalSet {
  const closes = candles.map((candle) => candle.close);
  const volumes = candles.map((candle) => candle.volume);
  const price = closes.at(-1)!;
  const atr14 = atr(candles, 14);
  const macdValue = macd(closes);
  const avgVolume20 = sma(volumes, 20);

  return {
    sma10: sma(closes, 10),
    sma20: sma(closes, 20),
    sma50: sma(closes, 50),
    sma100: sma(closes, 100),
    sma200: sma(closes, 200),
    ema10: ema(closes, 10),
    ema20: ema(closes, 20),
    ema50: ema(closes, 50),
    ema100: ema(closes, 100),
    ema200: ema(closes, 200),
    rsi14: rsi(closes, 14),
    atr14,
    atrPercent: (atr14 / price) * 100,
    // The tested TCS source data matches Groww's displayed MACD most closely
    // when this field is the MACD histogram. Keep the signal separately.
    macd: macdValue.histogram,
    macdSignal: macdValue.signal,
    avgVolume20,
    volumeRatio: volumes.at(-1)! / avgVolume20,
    pivots: classicPivots(candles),
  };
}
