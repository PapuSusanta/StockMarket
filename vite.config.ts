import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    server: {
      proxy: {
        "/yahoo": {
          target: env.YAHOO_PROXY_TARGET || "https://query1.finance.yahoo.com",
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/yahoo/, ""),
          headers: {
            "User-Agent": "Mozilla/5.0 ... ",
            Accept: "application/json, text/plain, */*",
            "Accept-Language": "en-US,en;q=0.9",
            Origin: "https://query1.finance.yahoo.com",
            Referer: "https://query1.finance.yahoo.com/",
          },
        },
      },
    },
  };
});
