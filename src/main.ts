import './style.css';
import { calculate, calculateDaily } from './indicators';
import { loadYahoo, normalizeYahooSymbol } from './yahoo';
import type { Analysis } from './types';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = /*html*/ `
  <main class="shell">
    <header>
      <div>
        <div class="eyebrow">INDIAN STOCK CALCULATOR</div>
        <h1>Stock Analysis</h1>
        <p>Yahoo Finance → deterministic technical calculation</p>
      </div>
      <form id="form">
        <input id="symbol" value="TCS.NS" placeholder="e.g. TCS.NS or TCS.BO" autocomplete="off">
        <button type="submit">Calculate</button>
      </form>
    </header>

    <section id="status" class="status">Enter a stock symbol and calculate.</section>
    <section id="result"></section>
  </main>
`;

const $ = <T extends Element>(selector: string): T => {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Element not found: ${selector}`);
  return element;
};

const money = (n: number) =>
  Number.isFinite(n)
    ? `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';

const num = (n: number, digits = 2) => Number.isFinite(n) ? n.toFixed(digits) : '—';
const volume = (n: number) => Number.isFinite(n)
  ? n.toLocaleString('en-IN', { maximumFractionDigits: 0 })
  : '—';

const ratio = (numerator: number, denominator: number) =>
  Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? numerator / denominator
    : NaN;

const signed = (n: number, digits = 2) =>
  Number.isFinite(n) ? `${n >= 0 ? '+' : ''}${n.toFixed(digits)}` : '—';

function row(label: string, value: string) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function rsiVerdict(value: number) {
  if (!Number.isFinite(value)) return '—';
  if (value < 30) return 'Oversold';
  if (value > 70) return 'Overbought';
  return 'Neutral';
}

function macdVerdict(value: number) {
  if (!Number.isFinite(value)) return '—';
  return value >= 0 ? 'Above signal' : 'Below signal';
}

function render(a: Analysis) {
  const daily = a.daily;

  $('#result').innerHTML = /*html*/ `
    <section class="hero">
      <div>
        <div class="symbol">${a.symbol}</div>
        <h2>${a.name}</h2>
      </div>
      <div class="price">
        <strong>${money(a.price)}</strong>
        <span class="${a.changePercent >= 0 ? 'up' : 'down'}">
          ${a.changePercent >= 0 ? '+' : ''}${num(a.changePercent)}%
        </span>
      </div>
    </section>

    <section class="section-title">
      <h2>Original calculator</h2>
      <p>Preserved exactly as the earlier calculator: hourly candles, same periods and formulas.</p>
    </section>

    <section class="grid">
      <article>
        <h3>20-hour range levels</h3>
        ${row('Support', money(a.support))}
        ${row('Resistance', money(a.resistance))}
        ${row('Heuristic target', money(a.target))}
        ${row('Stop loss', money(a.stopLoss))}
        ${row('Risk / Reward', `1:${num(a.riskReward)}`)}
        ${row('Upside to target', `${num(a.upsidePercent)}%`)}
      </article>

      <article>
        <h3>Trend</h3>
        ${row('SMA 20H', money(a.legacySma20))}
        ${row('SMA 50H', money(a.legacySma50))}
        ${row('SMA 200H', money(a.legacySma200))}
        ${row('EMA 20H', money(a.legacyEma20))}
        ${row('EMA 50H', money(a.legacyEma50))}
        ${row('EMA 200H', money(a.legacyEma200))}
      </article>

      <article>
        <h3>Momentum</h3>
        ${row('RSI 14H', num(a.legacyRsi14))}
        ${row('MACD line (12,26,9) H', num(a.legacyMacd))}
        ${row('MACD signal H', num(a.legacyMacdSignal))}
        ${row('ATR 14H', money(a.legacyAtr14))}
        ${row('ATR % H', `${num(a.legacyAtrPercent)}%`)}
      </article>

      <article>
        <h3>Volume & range</h3>
        ${row('Volume', volume(a.liveVolume))}
        ${row('Avg volume 20H', volume(a.legacyAvgVolume20))}
        ${row('Volume ratio', `${num(a.legacyVolumeRatio)}x`)}
        ${row('Day high', money(a.dayHigh))}
        ${row('Day low', money(a.dayLow))}
      </article>

      <article>
        <h3>52 week</h3>
        ${row('52W high', money(a.week52High))}
        ${row('52W low', money(a.week52Low))}
        ${row('Price → 52W high', `${num((a.price / a.week52High - 1) * 100)}%`)}
        ${row('Price → 52W low', `${num((a.price / a.week52Low - 1) * 100)}%`)}
      </article>
    </section>

    <section class="section-title">
      <h2>Daily technicals</h2>
      <p>Daily indicators use Yahoo Finance daily candles. The hourly metrics above are calculated separately.</p>
    </section>

    <section class="grid">
      <article>
        <h3>Performance</h3>
        ${row('Open', money(a.open))}
        ${row('Previous close', money(a.previousClose))}
        ${row('Today high', money(a.dayHigh))}
        ${row('Today low', money(a.dayLow))}
        ${row('Live volume', volume(a.liveVolume))}
        ${row('Lower circuit', '—')}
        ${row('Upper circuit', '—')}
      </article>

      <article>
        <h3>Classic pivots</h3>
        ${row('R3', money(daily.pivots.r3))}
        ${row('R2', money(daily.pivots.r2))}
        ${row('R1', money(daily.pivots.r1))}
        ${row('Pivot', money(daily.pivots.pivot))}
        ${row('S1', money(daily.pivots.s1))}
        ${row('S2', money(daily.pivots.s2))}
        ${row('S3', money(daily.pivots.s3))}
      </article>

      <article>
        <h3>Daily indicators</h3>
        ${row('RSI (14)', `${num(daily.rsi14)} — ${rsiVerdict(daily.rsi14)}`)}
        ${row('MACD histogram (12,26,9)', `${signed(daily.macd)} — ${macdVerdict(daily.macd)}`)}
        ${row('MACD line', signed(daily.macdLine))}
        ${row('MACD Signal', signed(daily.macdSignal))}
        ${row('ATR (14)', money(daily.atr14))}
        ${row('ATR %', `${num(daily.atrPercent)}%`)}
      </article>

      <article>
        <h3>Moving averages</h3>
        ${row('10D SMA', money(daily.sma10))}
        ${row('10D EMA', money(daily.ema10))}
        ${row('20D SMA', money(daily.sma20))}
        ${row('20D EMA', money(daily.ema20))}
        ${row('50D SMA', money(daily.sma50))}
        ${row('50D EMA', money(daily.ema50))}
        ${row('100D SMA', money(daily.sma100))}
        ${row('100D EMA', money(daily.ema100))}
        ${row('200D SMA', money(daily.sma200))}
        ${row('200D EMA', money(daily.ema200))}
      </article>

      <article>
        <h3>Daily volume</h3>
        ${row('Live volume', volume(a.liveVolume))}
        ${row('20D avg volume', volume(daily.avgVolume20))}
        ${row("Today's volume / 20D avg", `${num(ratio(a.liveVolume, daily.avgVolume20))}x`)}
        ${row('Delivery %', '—')}
      </article>

      <article>
        <h3>52 week</h3>
        ${row('52W high', money(a.week52High))}
        ${row('52W low', money(a.week52Low))}
        ${row('Price → 52W high', `${num((a.price / a.week52High - 1) * 100)}%`)}
        ${row('Price → 52W low', `${num((a.price / a.week52Low - 1) * 100)}%`)}
      </article>

    </section>
  `;
}

$('#form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const input = $<HTMLInputElement>('#symbol');
  const status = $<HTMLElement>('#status');
  const symbol = input.value.trim().toUpperCase();
  if (!symbol) return;

  let yahooSymbol: string;
  try {
    yahooSymbol = normalizeYahooSymbol(symbol);
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Enter a valid stock symbol';
    return;
  }
  status.textContent = `Calculating ${yahooSymbol}…`;

  try {
    const data = await loadYahoo(yahooSymbol);

    // Preserve the old calculator's exact input: hourly candles.
    const legacy = calculate(data.candles);
    const recent = data.candles.slice(-20);
    const support = Math.min(...recent.map((candle) => candle.low));
    const resistance = Math.max(...recent.map((candle) => candle.high));
    const target = resistance + (resistance - support) * 2;
    const stopLoss = support;
    const risk = data.price - stopLoss;
    const reward = target - data.price;

    const analysis: Analysis = {
      symbol: yahooSymbol,
      name: data.name,
      price: data.price,
      changePercent: data.changePercent,
      dayHigh: data.dayHigh,
      dayLow: data.dayLow,
      week52High: data.week52High,
      week52Low: data.week52Low,
      open: data.open,
      previousClose: data.previousClose,
      liveVolume: data.liveVolume,

      support,
      resistance,
      target,
      stopLoss,
      riskReward: risk > 0 ? reward / risk : NaN,
      upsidePercent: ((target / data.price) - 1) * 100,

      legacySma20: legacy.sma20,
      legacySma50: legacy.sma50,
      legacySma200: legacy.sma200,
      legacyEma20: legacy.ema20,
      legacyEma50: legacy.ema50,
      legacyEma200: legacy.ema200,
      legacyRsi14: legacy.rsi14,
      legacyMacd: legacy.macd,
      legacyMacdSignal: legacy.macdSignal,
      legacyAtr14: legacy.atr14,
      legacyAtrPercent: legacy.atrPercent,
      legacyAvgVolume20: legacy.avgVolume20,
      legacyVolumeRatio: legacy.volumeRatio,

      daily: calculateDaily(data.dailyCandles),
    };

    render(analysis);
    status.textContent = 'Original + daily technical calculations completed from Yahoo Finance data.';
  } catch (error) {
    console.error(error);
    status.textContent = error instanceof Error ? error.message : 'Calculation failed';
    $('#result').innerHTML = '';
  }
});
