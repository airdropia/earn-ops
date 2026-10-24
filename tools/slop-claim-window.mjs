// Complete the Slop payout registration end to end.
//
// The identity service expires a flow after about five minutes, so this script
// does the whole thing in one pass: it starts a flow, walks the GitHub consent
// page with the account that is already signed in, polls for the assertion and
// writes the wallet claim. The GitHub password is never involved: the consent
// page is reached with the session that is already in the browser profile.
//
// Run with: ego-browser nodejs < tools/slop-claim-window.mjs

import { appendFileSync, writeFileSync } from "node:fs";

const ADDRESS = process.env.SLOP_CLAIM_ADDRESS || "3q2zruZVf7mDviRA5BzFHQWsUDMRsbpipu7W3bFisBek";
const IDENTITY = "https://identity.slop.cash";
const API = "https://api.slop.cash";
const RESULT_PATH = "C:/Users/Admin/Desktop/Best/.tmp/slop-claim-result.json";
const LOG_PATH = "C:/Users/Admin/Desktop/Best/.tmp/slop-claim-window.log";

const task = await taskSpace("earn-lane-2026-10-20");

const log = (line) => {
  const stamped = new Date().toISOString() + " " + line;
  console.log(stamped);
  try {
    appendFileSync(LOG_PATH, stamped + "\n");
  } catch {}
};

// close the pages that earlier probes left behind, the space has a page budget
for (const label of ["p5", "p7", "p10", "p11", "p12", "p13", "p14", "p2", "p3", "p4", "p6", "p8", "p9"]) {
  try {
    const stale = task.page(label);
    if (stale) await stale.close();
  } catch {}
}
log("closed the stale pages");

const page = await (async () => {
  try {
    const p1 = task.page("p1");
    if (p1) {
      const alive = await p1.evaluate(() => true).catch(() => false);
      if (alive) return p1;
    }
  } catch {}
  return await task.newPage();
})();

const clickAuthorize = async () => {
  // first try the exact label, then any control whose label starts with it
  const picked = await page.evaluate(() => {
    const out = [];
    const walk = (root) => {
      for (const el of root.querySelectorAll("*")) {
        const tc = ((el.textContent || "") + "").trim().replace(/\s+/g, " ");
        if (!tc || tc.length > 40) continue;
        if (!/^authoriz(e|ation|ing)?$/i.test(tc)) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        const known = String(el.className || "").includes("js-oauth-authorize-btn");
        const tagBonus = known ? 0 : el.tagName === "BUTTON" ? 1 : el.tagName === "INPUT" ? 2 : 5;
        out.push({ t: tc, tag: el.tagName, type: el.type || "", x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2), rank: tagBonus + tc.length / 100 });
      }
      for (const el of root.querySelectorAll("*")) if (el.shadowRoot) walk(el.shadowRoot);
    };
    walk(document);
    out.sort((a, b) => a.rank - b.rank);
    return out.slice(0, 6);
  });
  if (!picked.length) {
    const summary = await page.evaluate(() => {
      const frames = document.querySelectorAll("iframe").length;
      const roots = [];
      const walk = (root) => {
        for (const el of root.querySelectorAll("*")) if (el.shadowRoot) { roots.push(el.tagName); walk(el.shadowRoot); }
      };
      walk(document);
      return JSON.stringify({ frames, shadowHosts: roots.slice(0, 8), body: (document.body.innerText || "").replace(/\n+/g, " | ").slice(0, 240) });
    });
    log("no authorize control found, page shape: " + summary);
    return false;
  }
  const b = picked[0];
  await page.mouse.click(b.x, b.y);
  await page.waitForTimeout(6000);
  log("clicked authorize candidate " + b.tag + (b.type ? "[" + b.type + "]" : "") + " " + JSON.stringify(b.t) + " -> " + (await page.evaluate(() => location.href)).slice(0, 90));
  return true;
};

const clickExact = async (label) => {
  const boxes = await page.evaluate((needle) => {
    const out = [];
    const walk = (root) => {
      for (const el of root.querySelectorAll("input, button, a, [role=button]")) {
        const t = ((el.value || el.innerText || el.getAttribute("aria-label") || "") + "").trim().replace(/\s+/g, " ");
        if (t.toLowerCase() !== needle.toLowerCase()) continue;
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        out.push({ tag: el.tagName, type: el.type || "", text: t, x: Math.round(r.x + r.width / 2), y: Math.round(r.y + r.height / 2) });
      }
      for (const el of root.querySelectorAll("*")) if (el.shadowRoot) walk(el.shadowRoot);
    };
    walk(document);
    return out;
  }, label);
  if (!boxes.length) {
    const near = await page.evaluate((needle) => {
      const out = [];
      const walk = (root) => {
        for (const el of root.querySelectorAll("input, button, a, [role=button]")) {
          const t = ((el.value || el.innerText || el.getAttribute("aria-label") || "") + "").trim().replace(/\s+/g, " ");
          if (!t || t.length > 40) continue;
          if (!/authoriz|authoris|grant|allow/i.test(t)) continue;
          const r = el.getBoundingClientRect();
          if (r.width < 4 || r.height < 4) continue;
          out.push(el.tagName + (el.type ? "[" + el.type + "]" : "") + " " + JSON.stringify(t) + " @" + Math.round(r.x) + "," + Math.round(r.y));
        }
        for (const el of root.querySelectorAll("*")) if (el.shadowRoot) walk(el.shadowRoot);
      };
      walk(document);
      return out;
    }, label);
    log("no exact match for " + JSON.stringify(label) + ", near matches: " + JSON.stringify(near).slice(0, 400));
    return false;
  }
  const b = boxes[0];
  await page.mouse.click(b.x, b.y);
  await page.waitForTimeout(6000);
  const url = await page.evaluate(() => location.href);
  log("clicked " + b.tag + (b.type ? "[" + b.type + "]" : "") + " " + JSON.stringify(b.text) + " -> " + url.slice(0, 90));
  return true;
};

const post = async (url, body, headers) => {
  const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(headers || {}) }, body: JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, json, text };
};

const register = async (assertion) => {
  const session = await post(API + "/api/v1/auth/session", {}, { "X-Slop-Identity-Assertion": assertion });
  if (!session.json || typeof session.json.token !== "string") {
    throw new Error("auth session failed: " + session.status + " " + session.text.slice(0, 200));
  }
  const headers = { Authorization: "Bearer " + session.json.token };
  const currentRes = await fetch(API + "/api/v1/wallet-claims/current", { headers });
  let current = null;
  if (currentRes.status !== 404) {
    const text = await currentRes.text();
    try {
      current = JSON.parse(text);
    } catch {}
  }
  if (current && current.address === ADDRESS) {
    return { alreadyRegistered: true, ...current };
  }
  const created = await post(API + "/api/v1/wallet-claims", { address: ADDRESS, supersedesClaimId: (current && current.claimId) || null }, headers);
  if (!created.json) throw new Error("wallet claim failed: " + created.status + " " + created.text.slice(0, 200));
  return created.json;
};

log("registration pass starting for " + ADDRESS);
const start = await post(IDENTITY + "/v1/oauth/start", { audience: "private-trace-api" });
if (!start.json || !start.json.authorizationUrl) {
  log("could not start a flow: " + start.status + " " + start.text.slice(0, 200));
  process.exit(1);
}
const flow = start.json;
log("flow " + flow.flowId + " expires " + flow.expiresAt);

try {
  await page.goto(flow.authorizationUrl, { waitUntil: "commit", timeout: 45000 });
} catch (e) {
  log("navigation note: " + String(e && e.message ? e.message : e).slice(0, 120));
}
await page.waitForTimeout(6000);

let url = await page.evaluate(() => location.href);
if (/select_account/.test(url)) {
  for (let i = 0; i < 8; i++) {
    if (await clickExact("Continue")) break;
    await page.waitForTimeout(3000);
  }
  await page.waitForTimeout(2000);
  url = await page.evaluate(() => location.href);
}
if (/login\/oauth\/authorize/.test(url)) {
  // the consent page renders slowly, so the authorize control is looked for
  // over a window instead of a single check
  for (let i = 0; i < 10; i++) {
    if (await clickAuthorize()) break;
    await page.waitForTimeout(3500);
  }
}

const deadline = Date.parse(flow.expiresAt);
let wait = flow.pollAfterSeconds || 2;
let assertion = null;
while (Date.now() < deadline) {
  await page.waitForTimeout(Math.max(2, wait) * 1000);
  const poll = await post(IDENTITY + "/v1/oauth/poll", { flowId: flow.flowId, pollCapability: flow.pollCapability, audience: "private-trace-api" });
  if (poll.status === 202) {
    wait = (poll.json && poll.json.retryAfterSeconds) || wait;
    continue;
  }
  if (poll.json && poll.json.status === "complete" && typeof poll.json.assertion === "string") {
    assertion = poll.json.assertion;
    log("authorization complete");
    break;
  }
  log("poll " + poll.status + " " + poll.text.slice(0, 160));
  break;
}

if (assertion) {
  const claim = await register(assertion);
  log("REGISTERED " + JSON.stringify(claim).slice(0, 500));
  writeFileSync(RESULT_PATH, JSON.stringify({ address: ADDRESS, claim, at: new Date().toISOString() }, null, 2));
} else {
  log("no assertion yet");
}
try {
  await page.close();
} catch {}
log("done");
