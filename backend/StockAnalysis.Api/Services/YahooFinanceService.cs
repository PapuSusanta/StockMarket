using System.Text.Json;
using StockAnalysis.Api.Models;

namespace StockAnalysis.Api.Services;

public sealed class YahooFinanceService(HttpClient http)
{
    private sealed record ChartData(JsonElement Meta, List<Candle> Candles);
    public static string NormalizeSymbol(string input)
    {
        var raw = input.Trim().ToUpperInvariant();
        if (raw.Length == 0) throw new ArgumentException("Enter a stock symbol");
        var exchange = raw.StartsWith("BSE:") ? "BSE" : raw.StartsWith("NSE:") ? "NSE" : "";
        var symbol = exchange.Length > 0 ? raw[4..] : raw;
        if (symbol.EndsWith(".NS") || symbol.EndsWith(".BO")) return symbol;
        return symbol + (exchange == "BSE" ? ".BO" : ".NS");
    }

    private async Task<ChartData> Fetch(string symbol, string range, string interval, CancellationToken token)
    {
        var url = $"https://query1.finance.yahoo.com/v8/finance/chart/{Uri.EscapeDataString(symbol)}?range={range}&interval={interval}&events=history";
        using var response = await http.GetAsync(url, token);
        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Yahoo Finance request failed ({(int)response.StatusCode})");
        }
        using var doc = JsonDocument.Parse(await response.Content.ReadAsStreamAsync(token));
        var root = doc.RootElement.GetProperty("chart");
        if (root.TryGetProperty("error", out var error) && error.ValueKind != JsonValueKind.Null)
        {
            throw new InvalidOperationException("Yahoo Finance could not find data for this symbol");
        }
        if (!root.TryGetProperty("result", out var results) || results.GetArrayLength() == 0)
        {
            throw new InvalidOperationException($"No Yahoo {interval} data found for {symbol}");
        }
        var result = results[0];
        var meta = result.TryGetProperty("meta", out var m) ? m.Clone() : JsonDocument.Parse("{}").RootElement.Clone();
        var times = result.TryGetProperty("timestamp", out var timestamps) ? timestamps.EnumerateArray().Select(x => x.GetInt64()).ToArray() : [];
        var quote = result.GetProperty("indicators").GetProperty("quote")[0];
        var candles = new List<Candle>();
        double? Read(string key, int index)
        {
            if (!quote.TryGetProperty(key, out var arr) || arr.GetArrayLength() <= index || arr[index].ValueKind is JsonValueKind.Null or JsonValueKind.Undefined) return null;
            var v = arr[index].GetDouble(); return double.IsFinite(v) ? v : null;
        }
        for (var i = 0; i < times.Length; i++)
        {
            var open = Read("open", i); var high = Read("high", i); var low = Read("low", i); var close = Read("close", i);
            if (open is null || high is null || low is null || close is null) continue;
            candles.Add(new(times[i], open.Value, high.Value, low.Value, close.Value, Read("volume", i) ?? double.NaN));
        }
        return new(meta, candles);
    }
    private static double Number(JsonElement meta, string key, double fallback = double.NaN) =>
        meta.ValueKind == JsonValueKind.Object && meta.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.Number && value.TryGetDouble(out var n) ? n : fallback;
    private static string Text(JsonElement meta, string key, string fallback) =>
        meta.ValueKind == JsonValueKind.Object && meta.TryGetProperty(key, out var value) && value.ValueKind == JsonValueKind.String ? value.GetString() ?? fallback : fallback;

    public async Task<AnalysisResponse> Analyze(string input, CancellationToken token)
    {
        var symbol = NormalizeSymbol(input);
        var hourlyTask = Fetch(symbol, "1y", "60m", token);
        var dailyTask = Fetch(symbol, "2y", "1d", token);
        await Task.WhenAll(hourlyTask, dailyTask);
        var hourly = await hourlyTask;
        var daily = await dailyTask;
        var h = hourly.Candles;
        var d = daily.Candles;
        if (h.Count == 0 || d.Count == 0)
        {
            throw new InvalidOperationException($"No usable Yahoo price history found for {symbol}");
        }
        var meta = hourly.Meta;
        var lastHour = h[^1];
        var price = Number(meta, "regularMarketPrice", lastHour.Close);
        var history = d.TakeLast(252).ToArray();
        var weekHigh = Number(meta, "fiftyTwoWeekHigh", history.Max(x => x.High));
        var weekLow = Number(meta, "fiftyTwoWeekLow", history.Min(x => x.Low));
        var legacy = TechnicalCalculator.Legacy(h);
        var dailyTechnicals = TechnicalCalculator.Daily(d);
        var pivots = dailyTechnicals.Pivots;
        var support = pivots.S1;
        var resistance = pivots.R1;
        var target = pivots.R2;
        var risk = price - support;
        var reward = target - price;
        var marketTime = Number(meta, "regularMarketTime", lastHour.Time);
        var name = Text(meta, "longName", Text(meta, "shortName", symbol));

        return new(symbol, name, price, Number(meta, "regularMarketChangePercent"), Number(meta, "regularMarketDayHigh"),
            Number(meta, "regularMarketDayLow"), weekHigh, weekLow, Number(meta, "regularMarketOpen"),
            Number(meta, "previousClose"), Number(meta, "regularMarketVolume"), (long)marketTime,
            double.IsFinite(Number(meta, "regularMarketTime")) ? "quote" : "hourly candle",
            support, resistance, target, support, risk > 0 && reward > 0 ? reward / risk : double.NaN,
            (target / price - 1) * 100, legacy.Sma20, legacy.Sma50, legacy.Sma200, legacy.Ema20, legacy.Ema50,
            legacy.Ema200, legacy.Rsi14, legacy.Macd, legacy.MacdSignal, legacy.Atr14, legacy.AtrPercent,
            legacy.AvgVolume20, legacy.VolumeRatio, dailyTechnicals);
    }
}
