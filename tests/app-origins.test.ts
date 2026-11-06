import assert from "node:assert/strict";
import { test } from "node:test";
import { appOrigins } from "../src/lib/app-origins";

test("local sign-in and mutations trust loopback aliases on the configured port", () => {
  const origins = appOrigins({
    APP_ORIGIN: "http://127.0.0.1:3000/",
    NODE_ENV: "development",
  });
  assert.ok(origins.includes("http://localhost:3000"));
  assert.ok(origins.includes("http://127.0.0.1:3000"));
  assert.ok(origins.includes("http://[::1]:3000"));
  assert.ok(!origins.includes("http://localhost:3001"));
  assert.ok(!origins.includes("https://untrusted.example"));
});

test("production and public development origins remain exact", () => {
  assert.deepEqual(
    appOrigins({ APP_ORIGIN: "http://127.0.0.1:3000", NODE_ENV: "production" }),
    ["http://127.0.0.1:3000"],
  );
  assert.deepEqual(
    appOrigins({
      APP_ORIGIN: "https://kracar.example/",
      NODE_ENV: "development",
    }),
    ["https://kracar.example"],
  );
  assert.deepEqual(appOrigins({}), []);
});
