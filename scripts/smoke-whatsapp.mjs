#!/usr/bin/env node
/**
 * Smoke tests do pipeline WhatsApp — dispara 1 requisição por cenário contra
 * o dev server (default: http://localhost:3000). Exit code != 0 em falha.
 *
 * Uso:
 *   npm run dev            # terminal 1
 *   node scripts/smoke-whatsapp.mjs [base_url] [webhook_secret] [phone]
 *
 * Pré-requisitos:
 *   - Banco com `npx prisma db push` aplicado
 *   - Vendedor seed com phone_e164 casando com {{phone}} (default: 5531999990001)
 */

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const BASE = process.argv[2] ?? process.env.SMOKE_BASE_URL ?? "http://localhost:3000";
const SECRET = process.argv[3] ?? process.env.ZAPI_WEBHOOK_SECRET ?? "";
const PHONE = process.argv[4] ?? process.env.SMOKE_PHONE ?? "5531999990001";

const INBOUND = `${BASE}/api/webhooks/whatsapp/inbound`;
const STATUS  = `${BASE}/api/webhooks/whatsapp/status`;

const HEADERS = {
  "Content-Type": "application/json",
  ...(SECRET ? { "X-Zapi-Signature": SECRET } : {}),
};

let failed = 0;
const results = [];

async function run(name, fn) {
  const t = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - t });
    console.log(`  ✓ ${name} (${Date.now() - t}ms)`);
  } catch (err) {
    failed++;
    results.push({ name, ok: false, ms: Date.now() - t, err: err.message });
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

async function postInbound(body) {
  const res = await fetch(INBOUND, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

async function postStatus(body) {
  const res = await fetch(STATUS, { method: "POST", headers: HEADERS, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json };
}

console.log(`\nSmoke WhatsApp — base=${BASE} phone=${PHONE} secret=${SECRET ? "set" : "empty"}\n`);

await run("1.1 Health GET inbound", async () => {
  const res = await fetch(INBOUND);
  assert.equal(res.status, 200);
  const j = await res.json();
  assert.equal(j.ok, true);
});

await run("1.2 Cadastro 1-shot retorna ack", async () => {
  const { status, json } = await postInbound({
    messageId: randomUUID(),
    phone: PHONE,
    fromMe: false,
    text: { message: "Oi, tenho um cliente que quer um Civic EXL 2022 automático preto, até 130 mil, até 50 mil km. Nome João Silva, telefone 31988887777" },
    isGroup: false,
    notification: null,
  });
  assert.equal(status, 200);
  assert.equal(json.ack, true);
});

await run("1.3 Mensagem de grupo é ignorada", async () => {
  const { status, json } = await postInbound({
    messageId: randomUUID(), phone: PHONE, text: { message: "oi" }, isGroup: true,
  });
  assert.equal(status, 200);
  assert.equal(json.ignored, "group_message");
});

await run("1.4 fromMe é ignorada", async () => {
  const { status, json } = await postInbound({
    messageId: randomUUID(), phone: PHONE, fromMe: true, text: { message: "oi" }, isGroup: false,
  });
  assert.equal(status, 200);
  assert.equal(json.ignored, "from_me");
});

await run("1.5 Payload inválido → 400", async () => {
  const res = await fetch(INBOUND, { method: "POST", headers: HEADERS, body: "not-json" });
  assert.equal(res.status, 400);
});

await run("1.6 Campos obrigatórios faltando → 400", async () => {
  const { status, json } = await postInbound({ messageId: "", phone: "", isGroup: false });
  assert.equal(status, 400);
  assert.equal(json.error, "missing_fields");
});

await run("1.7 Idempotência (mesmo messageId 2x retorna ack nos dois)", async () => {
  const id = `DUP_${Date.now()}`;
  const body = { messageId: id, phone: PHONE, text: { message: "teste duplicata" }, isGroup: false, notification: null };
  const a = await postInbound(body);
  const b = await postInbound(body);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
});

if (SECRET) {
  await run("1.8 Assinatura inválida → 401 (só quando secret configurado)", async () => {
    const res = await fetch(INBOUND, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Zapi-Signature": "invalid" },
      body: JSON.stringify({ messageId: randomUUID(), phone: PHONE, text: { message: "x" }, isGroup: false }),
    });
    assert.equal(res.status, 401);
  });
}

await run("2.1 Status webhook aceita SENT", async () => {
  const { status, json } = await postStatus({ messageId: "ABC123", status: "SENT" });
  assert.equal(status, 200);
  assert.equal(json.ack, true);
});

await run("2.2 Status webhook aceita FAILED", async () => {
  const { status, json } = await postStatus({ messageId: "ABC123", status: "FAILED", failureReason: "blocked" });
  assert.equal(status, 200);
  assert.equal(json.ack, true);
});

console.log(`\n${results.filter((r) => r.ok).length}/${results.length} passaram. ${failed} falharam.\n`);
process.exit(failed > 0 ? 1 : 0);
