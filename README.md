# Indian Stock Calculator

The original calculator is preserved. The new daily technical layer is additive.

## Original calculator (preserved)
- Yahoo 1y / 60m candles
- SMA 20/50/200
- EMA 20/50/200
- RSI 14
- MACD 12/26/9
- ATR 14
- 20-candle average volume
- last 20-candle support/resistance
- target = resistance + 2 × (resistance - support)
- stop loss = support
- risk/reward and upside

The range levels are exploratory heuristics based on recent hourly bars. They are not forecasts or trade recommendations.

## Added daily technical layer
- Yahoo 2y / 1d candles
- SMA/EMA 10/20/50/100/200
- RSI 14
- MACD 12/26/9
- ATR 14
- Classic Pivot, R1/R2/R3, S1/S2/S3
- Daily volume comparison

No stock-specific hard-coded values and no AI are used.

When Yahoo does not expose a requested field, the UI shows `—` rather than substituting a different measurement. The quote timestamp is shown in IST; Yahoo data can be delayed depending on the exchange.

## Yahoo proxy configuration

The browser requests the same-origin `/yahoo` path. The Vite development proxy forwards it to Yahoo Finance. Copy `.env.example` to `.env` and set `YAHOO_PROXY_TARGET` if you need a different upstream origin; restart Vite after changing it. Keep this as a server-side proxy because the Yahoo request should not be redirected to an upstream from browser code.

`YAHOO_PROXY_TARGET` configures Vite's development server only. A static production build does not include a proxy. Configure your hosting platform or backend with a `/yahoo/*` rewrite/proxy to the Yahoo chart API before deploying; otherwise deployed requests will fail. Do not put private credentials in a `VITE_` variable.
