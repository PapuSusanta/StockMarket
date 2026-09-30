import './style.css';
import { calculate, calculateDaily } from './indicators';
import { loadYahoo } from './yahoo';
import type { Analysis, YahooFundamentals } from './types';

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
        <input id="symbol" value="TCS.NS" placeholder="e.g. TCS.NS" autocomplete="off">
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

const signed = (n: number, digits = 2) =>
  Number.isFinite(n) ? `${n >= 0 ? '+' : ''}${n.toFixed(digits)}` : '—';

const compactCr = (n: number) =>
  Number.isFinite(n) ? `₹${(n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 0 })}Cr` : '—';

function row(label: string, value: string) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function rsiVerdict(value: number) {
  if (value < 30) return 'Oversold';
  if (value > 70) return 'Overbought';
  return 'Neutral';
}

function macdVerdict(value: number) {
  return value >= 0 ? 'Bullish' : 'Bearish';
}

function betaVerdict(value: number) {
  if (!Number.isFinite(value)) return '—';
  if (value > 1.2) return 'Highly volatile';
  if (value < 0.8) return 'Less volatile';
  return 'Volatile like market';
}

function renderFundamentals(f: YahooFundamentals) {
  return `
    <article>
      <h3>Fundamentals</h3>
      ${row('Market cap', compactCr(f.marketCap))}
      ${row('P/E (TTM)', num(f.trailingPE))}
      ${row('P/B', num(f.priceToBook))}
      ${row('ROE', Number.isFinite(f.returnOnEquity) ? `${num(f.returnOnEquity)}%` : '—')}
      ${row('EPS (TTM)', money(f.trailingEPS))}
      ${row('Dividend yield', Number.isFinite(f.dividendYield) ? `${num(f.dividendYield)}%` : '—')}
      ${row('Book value', money(f.bookValue))}
      ${row('Debt / Equity', num(f.debtToEquity))}
      ${row('Beta', `${signed(f.beta)} — ${betaVerdict(f.beta)}`)}
      ${row('Industry P/E', num(f.industryPE))}
      ${row('Face value', money(f.faceValue))}
    </article>
  `;
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
        <h3>Price levels</h3>
        ${row('Support', money(a.support))}
        ${row('Resistance', money(a.resistance))}
        ${row('Target', money(a.target))}
        ${row('Stop loss', money(a.stopLoss))}
        ${row('Risk / Reward', `1:${num(a.riskReward)}`)}
        ${row('Upside to target', `${num(a.upsidePercent)}%`)}
      </article>

      <article>
        <h3>Trend</h3>
        ${row('SMA 20', money(a.legacySma20))}
        ${row('SMA 50', money(a.legacySma50))}
        ${row('SMA 200', money(a.legacySma200))}
        ${row('EMA 20', money(a.legacyEma20))}
        ${row('EMA 50', money(a.legacyEma50))}
        ${row('EMA 200', money(a.legacyEma200))}
      </article>

      <article>
        <h3>Momentum</h3>
        ${row('RSI 14', num(a.legacyRsi14))}
        ${row('MACD', num(a.legacyMacd))}
        ${row('MACD Signal', num(a.legacyMacdSignal))}
        ${row('ATR 14', money(a.legacyAtr14))}
        ${row('ATR %', `${num(a.legacyAtrPercent)}%`)}
      </article>

      <article>
        <h3>Volume & range</h3>
        ${row('Volume', a.liveVolume.toLocaleString('en-IN'))}
        ${row('Avg volume 20H', a.legacyAvgVolume20.toLocaleString('en-IN', { maximumFractionDigits: 0 }))}
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
      <p>Separate daily calculation added from the later technical screenshots. It does not replace the original calculation.</p>
    </section>

    <section class="grid">
      <article>
        <h3>Performance</h3>
        ${row('Open', money(a.open))}
        ${row('Previous close', money(a.previousClose))}
        ${row('Today high', money(a.dayHigh))}
        ${row('Today low', money(a.dayLow))}
        ${row('Live volume', a.liveVolume.toLocaleString('en-IN'))}
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
        ${row('RSI (14)', `${signed(daily.rsi14)} — ${rsiVerdict(daily.rsi14)}`)}
        ${row('MACD (12,26,9)', `${signed(daily.macd)} — ${macdVerdict(daily.macd)}`)}
        ${row('MACD Signal', signed(daily.macdSignal))}
        ${row('Beta', `${signed(a.fundamentals.beta)} — ${betaVerdict(a.fundamentals.beta)}`)}
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
        ${row('Live volume', a.liveVolume.toLocaleString('en-IN'))}
        ${row('20D avg volume', daily.avgVolume20.toLocaleString('en-IN', { maximumFractionDigits: 0 }))}
        ${row('Volume ratio', `${num(a.liveVolume / daily.avgVolume20)}x`)}
        ${row('Delivery %', '—')}
      </article>

      <article>
        <h3>52 week</h3>
        ${row('52W high', money(a.week52High))}
        ${row('52W low', money(a.week52Low))}
        ${row('Price → 52W high', `${num((a.price / a.week52High - 1) * 100)}%`)}
        ${row('Price → 52W low', `${num((a.price / a.week52Low - 1) * 100)}%`)}
      </article>

      ${renderFundamentals(a.fundamentals)}
    </section>
  `;
}

$('#form').addEventListener('submit', async (event) => {
  event.preventDefault();

  const input = $<HTMLInputElement>('#symbol');
  const status = $<HTMLElement>('#status');
  const symbol = input.value.trim().toUpperCase();
  if (!symbol) return;

  const yahooSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
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
      fundamentals: data.fundamentals,
    };

    render(analysis);
    status.textContent = 'Original + daily technical calculations completed from Yahoo Finance data.';
  } catch (error) {
    console.error(error);
    status.textContent = error instanceof Error ? error.message : 'Calculation failed';
    $('#result').innerHTML = '';
  }
});
