import "./style.css";
import type { Analysis } from "./types";

const app = document.querySelector<HTMLDivElement>("#app")!;

app.innerHTML = /*html*/ `
  <main class="shell">
    <header>
      <div>
        <div class="eyebrow">INDIAN STOCK CALCULATOR</div>
        <h1>Stock Analysis</h1>
        <p>Technical analysis calculated by the API</p>
      </div>
      <form id="form">
        <input id="symbol" value="" placeholder="e.g. TCS.NS or TCS.BO" autocomplete="off">
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
    ? `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : "—";

const num = (n: number, digits = 2) =>
  Number.isFinite(n) ? n.toFixed(digits) : "—";
const volume = (n: number) =>
  Number.isFinite(n)
    ? n.toLocaleString("en-IN", { maximumFractionDigits: 0 })
    : "—";

const ratio = (numerator: number, denominator: number) =>
  Number.isFinite(numerator) && Number.isFinite(denominator) && denominator > 0
    ? numerator / denominator
    : NaN;

const signed = (n: number, digits = 2) =>
  Number.isFinite(n) ? `${n >= 0 ? "+" : ""}${n.toFixed(digits)}` : "—";

const timestamp = (seconds: number) =>
  Number.isFinite(seconds)
    ? new Date(seconds * 1000).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kolkata",
      })
    : "time unavailable";

const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );

function row(label: string, value: string) {
  return `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`;
}

function rsiVerdict(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (value < 30) return "Oversold";
  if (value > 70) return "Overbought";
  return "Neutral";
}

function macdVerdict(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value >= 0 ? "Above signal" : "Below signal";
}

function render(a: Analysis) {
  const daily = a.daily;

  $("#result").innerHTML = /*html*/ `
    <section class="hero">
      <div>
        <div class="symbol">${escapeHtml(a.symbol)}</div>
        <h2>${escapeHtml(a.name)}</h2>
      </div>
      <div class="price">
        <strong>${money(a.price)}</strong>
        <span class="${Number.isFinite(a.changePercent) ? (a.changePercent >= 0 ? "up" : "down") : ""}">
          ${Number.isFinite(a.changePercent) ? `${a.changePercent >= 0 ? "+" : ""}${num(a.changePercent)}%` : "—"}
        </span>
      </div>
      <p class="data-note">Yahoo Finance · ${a.quoteTimeSource === "quote" ? "quote timestamp" : "latest hourly candle timestamp"}: ${timestamp(a.quoteTime)} (IST). Exchange feeds may be delayed.</p>
    </section>

    <section class="section-title">
      <h2>Original calculator</h2>
      <p>Preserved exactly as the earlier calculator: hourly candles, same periods and formulas.</p>
    </section>

    <section class="grid">
      <article>
        <h3>Daily pivot levels</h3>
        <p>Support, resistance, and target use the daily pivot levels shown below; these are reference levels, not trade signals.</p>
        ${row("Support", money(a.support))}
        ${row("Resistance", money(a.resistance))}
        ${row("Heuristic target", money(a.target))}
        ${row("Stop loss", money(a.stopLoss))}
        ${row("Risk / Reward", `1:${num(a.riskReward)}`)}
        ${row("Upside to target", `${num(a.upsidePercent)}%`)}
      </article>

      <article>
        <h3>Trend</h3>
        ${row("SMA 20H", money(a.legacySma20))}
        ${row("SMA 50H", money(a.legacySma50))}
        ${row("SMA 200H", money(a.legacySma200))}
        ${row("EMA 20H", money(a.legacyEma20))}
        ${row("EMA 50H", money(a.legacyEma50))}
        ${row("EMA 200H", money(a.legacyEma200))}
      </article>

      <article>
        <h3>Momentum</h3>
        ${row("RSI 14H", num(a.legacyRsi14))}
        ${row("MACD line (12,26,9) H", num(a.legacyMacd))}
        ${row("MACD signal H", num(a.legacyMacdSignal))}
        ${row("ATR 14H", money(a.legacyAtr14))}
        ${row("ATR % H", `${num(a.legacyAtrPercent)}%`)}
      </article>

      <article>
        <h3>Volume & range</h3>
        ${row("Volume", volume(a.liveVolume))}
        ${row("Avg volume 20H", volume(a.legacyAvgVolume20))}
        ${row("Volume ratio", `${num(a.legacyVolumeRatio)}x`)}
        ${row("Day high", money(a.dayHigh))}
        ${row("Day low", money(a.dayLow))}
      </article>

      <article>
        <h3>52 week</h3>
        ${row("52W high", money(a.week52High))}
        ${row("52W low", money(a.week52Low))}
        ${row("Price → 52W high", `${num((a.price / a.week52High - 1) * 100)}%`)}
        ${row("Price → 52W low", `${num((a.price / a.week52Low - 1) * 100)}%`)}
      </article>
    </section>

    <section class="section-title">
      <h2>Daily technicals</h2>
      <p>Daily indicators use Yahoo Finance daily candles. The hourly metrics above are calculated separately.</p>
    </section>

    <section class="grid">
      <article>
        <h3>Performance</h3>
        ${row("Open", money(a.open))}
        ${row("Previous close", money(a.previousClose))}
        ${row("Today high", money(a.dayHigh))}
        ${row("Today low", money(a.dayLow))}
        ${row("Live volume", volume(a.liveVolume))}
        ${row("Lower circuit", "—")}
        ${row("Upper circuit", "—")}
      </article>

      <article>
        <h3>Classic pivots</h3>
        ${row("R3", money(daily.pivots.r3))}
        ${row("R2", money(daily.pivots.r2))}
        ${row("R1", money(daily.pivots.r1))}
        ${row("Pivot", money(daily.pivots.pivot))}
        ${row("S1", money(daily.pivots.s1))}
        ${row("S2", money(daily.pivots.s2))}
        ${row("S3", money(daily.pivots.s3))}
      </article>

      <article>
        <h3>Daily indicators</h3>
        ${row("RSI (14)", `${num(daily.rsi14)} — ${rsiVerdict(daily.rsi14)}`)}
        ${row("MACD histogram (12,26,9)", `${signed(daily.macd)} — ${macdVerdict(daily.macd)}`)}
        ${row("MACD line", signed(daily.macdLine))}
        ${row("MACD Signal", signed(daily.macdSignal))}
        ${row("ATR (14)", money(daily.atr14))}
        ${row("ATR %", `${num(daily.atrPercent)}%`)}
      </article>

      <article>
        <h3>Moving averages</h3>
        ${row("10D SMA", money(daily.sma10))}
        ${row("10D EMA", money(daily.ema10))}
        ${row("20D SMA", money(daily.sma20))}
        ${row("20D EMA", money(daily.ema20))}
        ${row("50D SMA", money(daily.sma50))}
        ${row("50D EMA", money(daily.ema50))}
        ${row("100D SMA", money(daily.sma100))}
        ${row("100D EMA", money(daily.ema100))}
        ${row("200D SMA", money(daily.sma200))}
        ${row("200D EMA", money(daily.ema200))}
      </article>

      <article>
        <h3>Daily volume</h3>
        ${row("Live volume", volume(a.liveVolume))}
        ${row("20D avg volume", volume(daily.avgVolume20))}
        ${row("Today's volume / 20D avg", `${num(ratio(a.liveVolume, daily.avgVolume20))}x`)}
        ${row("Delivery %", "—")}
      </article>

      <article>
        <h3>52 week</h3>
        ${row("52W high", money(a.week52High))}
        ${row("52W low", money(a.week52Low))}
        ${row("Price → 52W high", `${num((a.price / a.week52High - 1) * 100)}%`)}
        ${row("Price → 52W low", `${num((a.price / a.week52Low - 1) * 100)}%`)}
      </article>

    </section>
  `;
}

$("#form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const input = $<HTMLInputElement>("#symbol");
  const status = $<HTMLElement>("#status");
  const symbol = input.value.trim().toUpperCase();
  if (!symbol) return;

  status.textContent = `Loading ${symbol}…`;
  try {
    const response = await fetch(`/api/analysis/${encodeURIComponent(symbol)}`);
    if (!response.ok) {
      const body = await response.json().catch(() => null) as { error?: string; message?: string; title?: string } | null;
      throw new Error(body?.error || body?.message || body?.title || `API request failed (${response.status})`);
    }
    render(await response.json() as Analysis);
    status.textContent = "Analysis loaded.";
  } catch (error) {
    console.error(error);
    status.textContent = error instanceof Error ? error.message : "Unable to load analysis";
    $("#result").innerHTML = "";
  }
});
