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

## Added daily technical layer
- Yahoo 2y / 1d candles
- SMA/EMA 10/20/50/100/200
- RSI 14
- MACD 12/26/9
- ATR 14
- Classic Pivot, R1/R2/R3, S1/S2/S3
- Daily volume comparison

No stock-specific hard-coded values and no AI are used.

When Yahoo does not expose a requested Groww field (for example delivery percentage or circuit limits), the UI shows `—` rather than inventing a value.
