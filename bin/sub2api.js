#!/usr/bin/env node
/**
 * sub2api — a small command line for Sub2API-compatible gateways.
 *
 * It answers the three questions a user of a relay has before anything else
 * works: is the gateway up, what models does my key see, and how much balance is
 * left. It talks only to the public user API and the OpenAI-compatible gateway,
 * never to the admin API.
 *
 * Unofficial. Not the Sub2API server project, which lives at
 * https://github.com/Wei-Shaw/sub2api.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = (() => {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    return JSON.parse(readFileSync(join(here, "..", "package.json"), "utf8")).version;
  } catch {
    return "0.0.0";
  }
})();

const HELP = `sub2api ${VERSION} — command line for Sub2API-compatible gateways

用法
  sub2api health   [--base URL]
  sub2api models   [--base URL] [--key KEY] [--json]
  sub2api balance  [--base URL] [--key KEY] [--json]
  sub2api dsh
  sub2api --version

参数
  --base  网关地址，默认 $SUB2API_BASE 或 https://sub.pscly.cc
  --key   API Key，默认 $SUB2API_KEY（以 sk- 开头）
  --json  输出原始 JSON，便于脚本处理

示例
  SUB2API_KEY=sk-xxx sub2api models
  sub2api balance --base https://sub.pscly.cc --key sk-xxx
`;

/** Parse `--flag value` pairs plus bare flags. */
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const name = arg.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) out[name] = true;
      else {
        out[name] = next;
        i += 1;
      }
    } else {
      out._.push(arg);
    }
  }
  return out;
}

function baseUrl(args) {
  return String(args.base ?? process.env.SUB2API_BASE ?? "https://sub.pscly.cc").replace(/\/+$/, "").replace(/\/v1$/, "");
}

function apiKey(args) {
  return args.key ?? process.env.SUB2API_KEY ?? "";
}

async function request(url, options = {}) {
  const timeout = AbortSignal.timeout(20000);
  let response;
  try {
    response = await fetch(url, { ...options, signal: timeout });
  } catch (error) {
    throw new Error(`连不上 ${url}：${error.message}`);
  }
  const text = await response.text();
  let body;
  try {
    body = text === "" ? undefined : JSON.parse(text);
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    const detail =
      (body && (body.message || (body.error && body.error.message))) || `HTTP ${response.status}`;
    const code = body && typeof body.code === "string" ? `（${body.code}）` : "";
    throw new Error(`${detail}${code}`);
  }
  return body;
}

async function health(args, json) {
  const base = baseUrl(args);
  const body = await request(`${base}/health`);
  if (json) return console.log(JSON.stringify(body, null, 2));
  const status = body && typeof body === "object" ? body.status ?? "ok" : String(body);
  console.log(`${base}  ${status}`);
}

async function models(args, json) {
  const key = apiKey(args);
  if (!key) throw new Error("缺少 API Key：用 --key 或设置 SUB2API_KEY");
  const base = baseUrl(args);
  const body = await request(`${base}/v1/models`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  const list = Array.isArray(body) ? body : Array.isArray(body?.data) ? body.data : [];
  if (json) return console.log(JSON.stringify(body, null, 2));
  if (list.length === 0) return console.log("这个 Key 看不到任何模型。");
  console.log(`${list.length} 个模型：`);
  for (const entry of list) {
    const id = typeof entry === "string" ? entry : entry?.id;
    const context = entry?.context_length ?? entry?.context_window;
    console.log(`  ${id}${context ? `  (${Math.round(context / 1000)}k)` : ""}`);
  }
}

async function balance(args, json) {
  const key = apiKey(args);
  if (!key) throw new Error("缺少 API Key：用 --key 或设置 SUB2API_KEY");
  const base = baseUrl(args);
  const body = await request(`${base}/v1/sub2api/billing`, {
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
  });
  if (json) return console.log(JSON.stringify(body, null, 2));
  const rate = body?.effective_rate_multiplier ?? body?.group_rate_multiplier;
  const parts = [];
  if (typeof body?.balance === "number") parts.push(`余额 ${body.balance}`);
  if (typeof rate === "number") parts.push(`倍率 ${rate}`);
  if (typeof body?.quota === "number" && body.quota > 0) parts.push(`额度上限 ${body.quota}`);
  console.log(parts.length > 0 ? parts.join("  ") : JSON.stringify(body));
}

function dsh() {
  console.log(`在 DeepSeek Harness 里用这个网关：

  dsh plugin add dsh-sub2api

装完打开「设置 → Sub2API」，填邮箱密码即可（会自动创建密钥并同步模型）。
插件主页：https://github.com/pscly/dsh-sub2api`);
}

async function main() {
  const argv = process.argv.slice(2);
  const command = argv[0];
  const args = parseArgs(argv.slice(1));
  const json = args.json === true;

  if (command === undefined || command === "help" || command === "--help" || command === "-h") {
    console.log(HELP);
    return;
  }
  if (command === "--version" || command === "-v" || command === "version") {
    console.log(VERSION);
    return;
  }

  switch (command) {
    case "health":
      return health(args, json);
    case "models":
      return models(args, json);
    case "balance":
      return balance(args, json);
    case "dsh":
      return dsh();
    default:
      console.error(`未知命令：${command}\n`);
      console.log(HELP);
      process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`错误：${error.message}`);
  process.exitCode = 1;
});
