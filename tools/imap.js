#!/usr/bin/env bun
// Minimal but correct IMAP client for reading the verification mail.
//
// The earlier script never reported a LOGIN result because it only inspected
// responses tagged A001, so every check after the login hung. This one tracks
// every tag, so a failed login is reported instead of a silent timeout.
//
// Usage:
//   bun tools/imap.js list
//   bun tools/imap.js link <seconds> [regex]   -> first URL of a new message
//   bun tools/imap.js body <id>
import tls from "node:tls";
import { readFileSync } from "node:fs";

const ROOT = "C:/Users/Admin/Desktop/Best";
const EMAIL = process.env.VF_EMAIL || readFileSync(`${ROOT}/.secrets/email.txt`, "utf8").trim();
const PASS = process.env.VF_EMAIL_PASS || readFileSync(`${ROOT}/.secrets/pass.txt`, "utf8").trim();

const sock = tls.connect({ host: "imap.gmail.com", port: 993, servername: "imap.gmail.com" });
sock.setEncoding("utf8");
let buf = "";
let step = 0;
let pending = null;          // {tag, resolve}
let bodies = [];             // collected RFC822 chunks
let fetchTag = null;
const seen = new Set();

const send = (line) => sock.write(line + "\r\n");
const wait = (tag) => new Promise((resolve) => { pending = { tag, resolve }; });

sock.on("data", (chunk) => {
  buf += chunk;
  let i;
  while ((i = buf.indexOf("\r\n")) >= 0) {
    const line = buf.slice(0, i);
    buf = buf.slice(i + 2);
    if (line.startsWith("* ")) {
      if (/^\* \d+ EXISTS/.test(line)) { /* mailbox size */ }
      if (/^\* LIST/.test(line)) { /* ignore */ }
      continue;
    }
    if (pending && line.startsWith(pending.tag)) {
      const ok = /OK/i.test(line);
      const { resolve } = pending;
      pending = null;
      resolve({ ok, line });
      continue;
    }
    if (fetchTag && line.startsWith(fetchTag)) {
      // Literal body follows the FETCH header line.
      bodies.push(line);
      continue;
    }
  }
  // Literal bodies arrive as {n}\r\n<data>\r\n - collect them separately.
  const lit = buf.match(/\{(\d+)\}\r\n/g);
  if (lit) {
    for (const m of lit) {
      const n = Number(m.match(/\{(\d+)\}/)[1]);
      const start = buf.indexOf(m) + m.length;
      if (buf.length >= start + n) {
        const data = buf.slice(start, start + n);
        buf = buf.slice(start + n + 2);
        bodies.push(data);
        const lit2 = buf.match(/\{(\d+)\}\r\n/g);
        if (lit2) { /* handled on next chunk */ }
      }
    }
  }
});

const fail = (m) => { console.error(m); process.exit(1); };
sock.on("error", (e) => fail("SOCKET_ERROR: " + e.message));
setTimeout(() => fail("TIMEOUT"), 40000);

await new Promise((r) => sock.once("secureConnect", r));
console.error(`[imap] connected as ${EMAIL}`);

// --- login -----------------------------------------------------------------
send(`A1 LOGIN "${EMAIL}" "${PASS}"`);
let r = await wait("A1");
if (!r.ok) fail("LOGIN_FAILED: " + r.line);
console.error("[imap] login ok");

send("A2 SELECT INBOX");
r = await wait("A2");
if (!r.ok) fail("SELECT_FAILED: " + r.line);

send("A3 SEARCH ALL");
r = await wait("A3");
const ids = (r.line.match(/\d+/g) || []).filter((x) => x !== "A3");
console.error(`[imap] ${ids.length} message(s)`);

if (ids.length) {
  bodies = [];
  const last = ids[ids.length - 1];
  fetchTag = "A4";
  send(`A4 FETCH ${last} (RFC822)`);
  r = await wait("A4");
  fetchTag = null;
}

const raw = bodies.join("\n");
const parse = (m) => {
  const from = (raw.match(new RegExp("^From: (.*)$", "m")) || [])[1] || "";
  const subject = (raw.match(new RegExp("^Subject: (.*)$", "m")) || [])[1] || "";
  return { from, subject };
};
const urls = (raw.match(/https?:\/\/[^\s"'<>\\)\]]+/g) || []).map((u) => u.replace(/[),.;'"]+$/, ""));

const cmd = process.argv[2] || "list";
if (cmd === "list") {
  const { from, subject } = parse();
  console.log(`FROM: ${from.trim()}`);
  console.log(`SUBJECT: ${subject.trim()}`);
  console.log(`URLS:\n${[...new Set(urls)].slice(0, 15).join("\n")}`);
} else if (cmd === "link") {
  const seconds = Number(process.argv[3] || 60);
  const re = process.argv[4] ? new RegExp(process.argv[4], "i") : null;
  const deadline = Date.now() + seconds * 1000;
  let known = new Set();
  while (Date.now() < deadline) {
    bodies = [];
    fetchTag = "A5";
    send("A5 SEARCH ALL");
    const sr = await wait("A5");
    const all = (sr.line.match(/\d+/g) || []).filter((x) => x !== "A5");
    for (const id of all) {
      if (known.has(id)) continue;
      known.add(id);
      bodies = [];
      fetchTag = "A6";
      send(`A6 FETCH ${id} (RFC822)`);
      await wait("A6");
      const text = bodies.join("\n");
      const u = (text.match(/https?:\/\/[^\s"'<>\\)\]]+/g) || []).map((x) => x.replace(/[),.;'"]+$/, ""));
      const subj = (text.match(/^Subject: (.*)$/m) || [])[1] || "";
      const blob = subj + " " + u.join(" ");
      if (re && !re.test(blob)) continue;
      const pick = u.find((x) => !/unsubscribe|mailto|google\.com\/url/i.test(x)) || u[0];
      if (pick) { console.log(pick); console.error("[imap] subject: " + subj.trim()); sock.end(); process.exit(0); }
    }
    await new Promise((res) => setTimeout(res, 5000));
  }
  console.log("NO_LINK");
  sock.end();
  process.exit(1);
} else {
  console.log(raw.slice(0, 3000));
}
sock.end();
process.exit(0);
