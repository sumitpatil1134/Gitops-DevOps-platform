const http = require("node:http");
const client = require("prom-client");

const PORT = process.env.PORT || 3000;

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const requestCounter = new client.Counter({
  name: "http_requests_total",
  help: "Total number of HTTP requests",
  labelNames: ["method", "route", "status"],
});

register.registerMetric(requestCounter);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  let status = 200;

  if (url.pathname === "/") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({
      message: "GitOps DevOps Platform API",
      status: "running"
    }));
  } else if (url.pathname === "/health") {
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ status: "healthy" }));
  } else if (url.pathname === "/metrics") {
    try {
      res.setHeader("Content-Type", register.contentType);
      res.end(await register.metrics());
    } catch (error) {
      status = 500;
      res.statusCode = status;
      res.end("Failed to collect metrics");
    }
  } else {
    status = 404;
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: "Not found" }));
  }

  requestCounter.inc({
    method: req.method,
    route: url.pathname,
    status: String(status),
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`GitOps DevOps Platform running on port ${PORT}`);
});
