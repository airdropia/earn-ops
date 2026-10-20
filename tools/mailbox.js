#!/usr/bin/env bun
// Readable inbox for automated signups.
//
// Why this exists: almost every platform that could give us a backlink or a
// post (Codeberg, GitLab, Sourcehut, Tumblr, WordPress.com, Hashnode,
// Substack) sends a CONFIRMATION LINK by email before the account works.
// The user's Gmail is accepted by those platforms but cannot be read from
// here (Google web sign-in is captcha-blocked, IMAP needs an app password),
// so a scriptable mailbox is what makes the whole lane work.
//
// The trick that makes it usable: platforms that email a 6-digit CODE stay
// blocked, but platforms that email a LINK are unlockable, because the link
// is readable from here.
//
// Usage:
//   bun tools/mailbox.js list                 -> newest messages (from, subject, id)
//   bun tools/mailbox.js watch <seconds> <re> -> wait for a message whose body matches
//   bun tools/mailbox.js link <seconds> [re]  -> wait for and print the first URL in it
import { readFileSync } from "node:fs";

const ROOT = "C:/Users/Admin/Desktop/Best";
const TOKEN = readFileSync(`${ROOT}/.secrets/mailtm_token.txt`, "utf8").trim();
const ADDR = readFileSync(`${ROOT}/.secrets/mailtm_addr.txt`, "utf8").trim();
const API = "https://api.mail.tm";

async function j(path, opts) {
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
  });
  const t = await r.text();
  try { return { status: r.status, body: JSON.parse(t) }; } catch { return { status: r.status, body: t }; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function messages() {
  const { body } = await j("/messages?page=1");
  return body["hydra:member"] || [];
}

async function full(id) {
  const { body } = await j(`/messages/${id}`);
  return body;
}

// Pull every plausible URL out of a message body (html + text).
function urlsIn(body) {
  const html = Array.isArray(body.html) ? body.html.join("\n") : (body.html || "");
  const text = body.text || "";
  const all = `${html}\n${text}`;
  const found = all.match(/https?:\/\/[^\s"'<>\\)]+/g) || [];
  // Prefer links that look like confirmations, then any link.
  const score = (u) => {
    let s = 0;
    if (/confirm|activate|verify|validate|registered|signup|check|mail/i.test(u)) s += 5;
    if (/\/users\/(activate|confirm|email_activate)/.test(u)) s += 6;
    if (/wordpress\.com\/wp-signup|wp-activate|hub\.git\.sr|codeberg\.org\/user\/activate/i.test(u)) s += 8;
    if (/unsubscribe|mailto:|\.png|\.jpg|\.svg/i.test(u)) s -= 4;
    return s;
  };
  return [...new Set(found.map((u) => u.replace(/[),.;'"]+$/, "")))].sort((a, b) => score(b) - score(a));
}

const [, , cmd, a1, a2] = process.argv;

if (cmd === "list") {
  const ms = await messages();
  console.log(`inbox ${ADDR}: ${ms.length} message(s)`);
  for (const m of ms.slice(0, 15)) console.log(`  [${m.id}] ${m.from?.address} :: ${m.subject}`);
} else if (cmd === "link" || cmd === "watch") {
  const seconds = Number(a1 || 60);
  const re = a2 ? new RegExp(a2, "i") : null;
  const deadline = Date.now() + seconds * 1000;
  const seen = new Set();
  while (Date.now() < deadline) {
    for (const m of await messages()) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      const full_msg = await full(m.id);
      const u = urlsIn(full_msg);
      const blob = `${full_msg.subject} ${full_msg.text || ""} ${u.join(" ")}`;
      if (re && !re.test(blob)) continue;
      if (cmd === "watch") {
        console.log(`--- ${m.from?.address} :: ${m.subject}`);
        console.log((full_msg.text || "").slice(0, 700));
      } else {
        const pick = u.find((x) => !/unsubscribe|mailto/i.test(x)) || u[0];
        if (pick) { console.log(pick); process.exit(0); }
      }
    }
    await sleep(6000);
  }
  console.log(cmd === "link" ? "NO_LINK" : "NO_MESSAGE");
  process.exit(1);
} else {
  console.log("usage: mailbox.js list | watch <sec> [re] | link <sec> [re]");
  process.exit(2);
}
