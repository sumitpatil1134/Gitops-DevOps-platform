const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn } = require("node:child_process");

let serverProcess;
let baseUrl;
let output = "";

test("GitOps DevOps Platform API", async (t) => {
  const port = 3100 + Math.floor(Math.random() * 1000);

  serverProcess = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout.on("data", (data) => {
    output += data.toString();
  });

  serverProcess.stderr.on("data", (data) => {
    output += data.toString();
  });

  const waitForServer = async () => {
    for (let i = 0; i < 50; i++) {
      if (serverProcess.exitCode !== null) {
        throw new Error(`Server exited early:\n${output}`);
      }

      try {
        return await fetch(`http://127.0.0.1:${port}/health`);
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    throw new Error(`Server did not start:\n${output}`);
  };

  try {
    const healthResponse = await waitForServer();

    await t.test("GET / returns application information", async () => {
      const response = await fetch(`http://127.0.0.1:${port}/`);
      assert.equal(response.status, 200);

      const body = await response.json();
      assert.equal(body.status, "running");
    });

    await t.test("GET /health returns healthy status", async () => {
      assert.equal(healthResponse.status, 200);

      const body = await healthResponse.json();
      assert.equal(body.status, "healthy");
    });

    await t.test("GET /metrics returns Prometheus metrics", async () => {
      const response = await fetch(`http://127.0.0.1:${port}/metrics`);
      assert.equal(response.status, 200);

      const body = await response.text();
      assert.match(body, /http_requests_total/);
    });

    await t.test("Unknown routes return 404", async () => {
      const response = await fetch(`http://127.0.0.1:${port}/unknown`);
      assert.equal(response.status, 404);
    });
  } finally {
    serverProcess.kill("SIGTERM");
    await new Promise((resolve) => {
      if (serverProcess.exitCode !== null) return resolve();
      serverProcess.once("exit", resolve);
      setTimeout(() => {
        if (serverProcess.exitCode === null) {
          serverProcess.kill("SIGKILL");
        }
        resolve();
      }, 2000);
    });
  }
});
