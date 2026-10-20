#!/usr/bin/env bun
// Send a short, honest inclusion pitch by email.
//
// Why email: the craft blogs that curate "where to find free SVG cut files"
// are exactly the pages a crafter looking for a memorial design visits. An
// editor adding one line to a list gives a permanent link and, more
// importantly, puts the tool in front of the people who buy cut files.
//
// The mail relay here is Guerrilla Mail, whose REST API can send as well as
// receive, because the only Gmail credentials on this machine cannot
// authenticate (no app password).
//
// Usage: bun tools/send-mail.js <to> <subject-file> <body-file>
import { readFileSync, writeFileSync } from "node:fs";

const ROOT = "C:/Users/Admin/Desktop/Best";
const [to, subjectFile, bodyFile] = process.argv.slice(2);
const subject = readFileSync(subjectFile, "utf8").trim();
const body = readFileSync(bodyFile, "utf8").trim();

const stateFile = `${ROOT}/.secrets/gm_state.json`;
let state = {};
try { state = JSON.parse(readFileSync(stateFile, "utf8")); } catch { state = {}; }

async function gm(params) {
  const u = new URL("https://api.guerrillamail.com/ajax.php");
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  if (state.sid_token) u.searchParams.set("sid_token", state.sid_token);
  const r = await fetch(u.href, { headers: { "User-Agent": "Mozilla/5.0" } });
  const t = await r.text();
  try { return JSON.parse(t); } catch { return { raw: t.slice(0, 200) }; }
}

if (!state.email_addr) {
  const a = await gm({ f: "get_email_address" });
  state = { email_addr: a.email_addr, sid_token: a.sid_token, alias: a.alias };
  writeFileSync(stateFile, JSON.stringify(state));
  console.log(`mailbox: ${state.email_addr}`);
}

const res = await gm({
  f: "send_email",
  email_to: to,
  email_subject: subject,
  email_body: body,
  email_from: `VectorForge Daily <${state.email_addr}>`,
});
console.log(`to=${to} subject="${subject.slice(0, 60)}" result=`, JSON.stringify(res).slice(0, 300));
