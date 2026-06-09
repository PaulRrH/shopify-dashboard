const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;
const SHOPIFY_TOKEN = process.env.SHOPIFY_TOKEN;
const SHOPIFY_STORE = process.env.SHOPIFY_STORE || 'devmarket-ixlaknow.myshopify.com';

// Proxy all /shopify-admin/* → Shopify Admin API with token injected server-side
app.use('/shopify-admin', createProxyMiddleware({
  target: `https://${SHOPIFY_STORE}`,
  changeOrigin: true,
  pathRewrite: { '^/shopify-admin': '' },
  on: {
    proxyReq: (proxyReq) => {
      if (SHOPIFY_TOKEN) {
        proxyReq.setHeader('X-Shopify-Access-Token', SHOPIFY_TOKEN);
      }
    },
  },
}));

// Serve compiled Angular app
const distDir = path.join(__dirname, 'dist', 'shopify-dashboard', 'browser');
app.use(express.static(distDir));

// SPA fallback — all unknown routes → index.html
app.get('*', (_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Shopify dashboard running on port ${PORT}`);
});
