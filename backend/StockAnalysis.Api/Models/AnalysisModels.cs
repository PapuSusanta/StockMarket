namespace StockAnalysis.Api.Models;

public sealed record Candle(long Time, double Open, double High, double Low, double Close, double Volume);
public sealed record PivotLevels(double Pivot, double R1, double R2, double R3, double S1, double S2, double S3);
public sealed record TechnicalSet(double Sma10, double Sma20, double Sma50, double Sma100, double Sma200,
    double Ema10, double Ema20, double Ema50, double Ema100, double Ema200, double Rsi14, double Atr14,
    double AtrPercent, double Macd, double MacdLine, double MacdSignal, double AvgVolume20, double VolumeRatio,
    PivotLevels Pivots);
public sealed record AnalysisResponse(string Symbol, string Name, double Price, double ChangePercent, double DayHigh,
    double DayLow, double Week52High, double Week52Low, double Open, double PreviousClose, double LiveVolume,
    long QuoteTime, string QuoteTimeSource, double Support, double Resistance, double Target, double StopLoss,
    double RiskReward, double UpsidePercent, double LegacySma20, double LegacySma50, double LegacySma200,
    double LegacyEma20, double LegacyEma50, double LegacyEma200, double LegacyRsi14, double LegacyMacd,
    double LegacyMacdSignal, double LegacyAtr14, double LegacyAtrPercent, double LegacyAvgVolume20,
    double LegacyVolumeRatio, TechnicalSet Daily);
