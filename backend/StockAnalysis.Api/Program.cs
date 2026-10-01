using System.Text.Json.Serialization;
using StockAnalysis.Api.Services;

var builder = WebApplication.CreateBuilder(args);
{
    builder.Services.AddControllers().AddJsonOptions(options =>
        options.JsonSerializerOptions.NumberHandling = JsonNumberHandling.AllowNamedFloatingPointLiterals);

    builder.Services.AddHttpClient<YahooFinanceService>(client =>
    {
        var headers = client.DefaultRequestHeaders;
        headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36");
        headers.Accept.ParseAdd("application/json");
        headers.AcceptLanguage.ParseAdd("en-US,en;q=0.9");
        headers.Referrer = new Uri("https://finance.yahoo.com/");
        headers.Add("Origin", "https://finance.yahoo.com");
    });
    builder.Services.AddCors(options => options.AddDefaultPolicy(policy =>
        policy.WithOrigins("http://localhost:5173", "http://127.0.0.1:5173").AllowAnyHeader().AllowAnyMethod()));
}

var app = builder.Build();
{
    app.UseCors();
    app.MapControllers();
    app.Run();
}