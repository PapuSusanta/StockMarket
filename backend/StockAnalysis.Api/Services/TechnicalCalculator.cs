using StockAnalysis.Api.Models;

namespace StockAnalysis.Api.Services;

public static class TechnicalCalculator
{
    private static double Average(IEnumerable<double> values)
    {
        var data = values.ToArray();
        return data.Length == 0 ? double.NaN : data.Average();
    }
    private static double Sma(IReadOnlyList<double> values, int period) => values.Count < period ? double.NaN : Average(values.Skip(values.Count - period));
    private static double Ema(IReadOnlyList<double> values, int period)
    {
        if (values.Count < period) return double.NaN;
        var multiplier = 2d / (period + 1);
        var result = Average(values.Take(period));
        for (var i = period; i < values.Count; i++) result = values[i] * multiplier + result * (1 - multiplier);
        return result;
    }
    private static double[] EmaSeries(IReadOnlyList<double> values, int period)
    {
        var result = Enumerable.Repeat(double.NaN, values.Count).ToArray();
        if (values.Count < period) return result;
        var multiplier = 2d / (period + 1);
        var current = Average(values.Take(period));
        result[period - 1] = current;
        for (var i = period; i < values.Count; i++) result[i] = current = values[i] * multiplier + current * (1 - multiplier);
        return result;
    }
    private static double Rsi(IReadOnlyList<double> values, int period = 14)
    {
        if (values.Count <= period) return double.NaN;
        double gain = 0, loss = 0;
        for (var i = 1; i <= period; i++) { var change = values[i] - values[i - 1]; gain += Math.Max(change, 0); loss += Math.Max(-change, 0); }
        var avgGain = gain / period; var avgLoss = loss / period;
        for (var i = period + 1; i < values.Count; i++)
        {
            var change = values[i] - values[i - 1];
            avgGain = (avgGain * (period - 1) + Math.Max(change, 0)) / period;
            avgLoss = (avgLoss * (period - 1) + Math.Max(-change, 0)) / period;
        }
        return avgLoss == 0 ? (avgGain == 0 ? 50 : 100) : 100 - 100 / (1 + avgGain / avgLoss);
    }
    private static double Atr(IReadOnlyList<Candle> candles, int period = 14)
    {
        if (candles.Count < period) return double.NaN;
        var ranges = new List<double> { candles[0].High - candles[0].Low };
        for (var i = 1; i < candles.Count; i++)
        {
            var c = candles[i]; var p = candles[i - 1];
            ranges.Add(Math.Max(c.High - c.Low, Math.Max(Math.Abs(c.High - p.Close), Math.Abs(c.Low - p.Close))));
        }
        var value = Average(ranges.Take(period));
        for (var i = period; i < ranges.Count; i++) value = (value * (period - 1) + ranges[i]) / period;
        return value;
    }
    private static (double Line, double Signal, double Histogram) Macd(IReadOnlyList<double> values)
    {
        var fast = EmaSeries(values, 12); var slow = EmaSeries(values, 26);
        var lines = Enumerable.Range(0, values.Count).Where(i => double.IsFinite(fast[i]) && double.IsFinite(slow[i])).Select(i => fast[i] - slow[i]).ToArray();
        var signals = EmaSeries(lines, 9);
        var line = lines.Length == 0 ? double.NaN : lines[^1]; var signal = signals.Length == 0 ? double.NaN : signals[^1];
        return (line, signal, double.IsFinite(line) && double.IsFinite(signal) ? line - signal : double.NaN);
    }
    private static PivotLevels Pivots(IReadOnlyList<Candle> candles)
    {
        if (candles.Count < 2) return new(double.NaN, double.NaN, double.NaN, double.NaN, double.NaN, double.NaN, double.NaN);
        var latest = candles[^1];
        var zone = TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata");
        var latestDate = TimeZoneInfo.ConvertTime(DateTimeOffset.FromUnixTimeSeconds(latest.Time), zone).Date;
        var now = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, zone);
        var previous = latestDate == now.Date && now.TimeOfDay < new TimeSpan(15, 30, 0) ? candles[^2] : latest;
        var pivot = (previous.High + previous.Low + previous.Close) / 3; var range = previous.High - previous.Low;
        return new(pivot, 2 * pivot - previous.Low, pivot + range, previous.High + 2 * (pivot - previous.Low),
            2 * pivot - previous.High, pivot - range, previous.Low - 2 * (previous.High - pivot));
    }
    public static (double Sma20, double Sma50, double Sma200, double Ema20, double Ema50, double Ema200,
        double Rsi14, double Atr14, double AtrPercent, double Macd, double MacdSignal, double AvgVolume20, double VolumeRatio) Legacy(IReadOnlyList<Candle> candles)
    {
        var closes = candles.Select(x => x.Close).ToArray(); var volumes = candles.Select(x => x.Volume).ToArray();
        var atr = Atr(candles); var macd = Macd(closes); var avgVol = Sma(volumes.Take(Math.Max(0, volumes.Length - 1)).Where(double.IsFinite).ToArray(), 20);
        return (Sma(closes, 20), Sma(closes, 50), Sma(closes, 200), Ema(closes, 20), Ema(closes, 50), Ema(closes, 200),
            Rsi(closes), atr, atr / (closes.Length == 0 ? double.NaN : closes[^1]) * 100, macd.Line, macd.Signal, avgVol,
            avgVol > 0 ? (volumes.Length == 0 ? double.NaN : volumes[^1]) / avgVol : double.NaN);
    }
    public static TechnicalSet Daily(IReadOnlyList<Candle> candles)
    {
        var closes = candles.Select(x => x.Close).ToArray(); var volumes = candles.Select(x => x.Volume).ToArray();
        var atr = Atr(candles); var macd = Macd(closes); var avgVol = Sma(volumes.Take(Math.Max(0, volumes.Length - 1)).Where(double.IsFinite).ToArray(), 20);
        var price = closes.Length == 0 ? double.NaN : closes[^1];
        return new(Sma(closes,10), Sma(closes,20), Sma(closes,50), Sma(closes,100), Sma(closes,200),
            Ema(closes,10), Ema(closes,20), Ema(closes,50), Ema(closes,100), Ema(closes,200), Rsi(closes), atr,
            atr / price * 100, macd.Histogram, macd.Line, macd.Signal, avgVol,
            avgVol > 0 ? (volumes.Length == 0 ? double.NaN : volumes[^1]) / avgVol : double.NaN, Pivots(candles));
    }
}
