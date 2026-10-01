# Indian Stock Calculator

The application is split into a Vite frontend and an ASP.NET Core 10 Web API. The API fetches Yahoo Finance data and calculates all technical metrics; the browser renders the API response.

## Run locally

Start the API in one terminal:

```sh
cd backend/StockAnalysis.Api
dotnet run
```

Start the Vite frontend in another terminal:

```sh
cd frontend
pnpm install
pnpm dev
```

Vite proxies `/api` to `http://localhost:5000` by default. Set `API_PROXY_TARGET` in the frontend environment if the API listens on a different address. The API permits the Vite development origin `http://localhost:5173`.

## API

`GET /api/analysis/{symbol}` returns the original hourly metrics and daily technical indicators. Examples: `/api/analysis/TCS.NS`, `/api/analysis/TCS.BO`, or `/api/analysis/NSE:TCS`.

Yahoo Finance fields that are unavailable are represented as `NaN` values by the API and shown as `—` by the frontend. Quote timestamps are displayed in IST. Yahoo data can be delayed depending on the exchange.

The support, resistance, and target fields use the daily classic pivot S1, R1, and R2 levels also shown in the daily technicals. They are reference levels, not trade recommendations. No stock-specific values are hard-coded.
