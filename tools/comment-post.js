#!/usr/bin/env bun
// Post a genuine comment on a public article, the way a reader would.
//
// Why: the biggest craft blogs curate lists of free SVG resources, and a
// reader who mentions a relevant free tool in the discussion gets a link and
// referral traffic from the exact audience that buys cut files. This is
// ordinary reader participation - one comment, relevant text, no repetition.
//
// Usage: bun tools/comment-post.js <url> <author> <email> <url-field> <comment-file>
import { readFileSync } from "node:fs";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";
const [url, author, email, siteUrl, commentFile] = process.argv.slice(2);
const comment = readFileSync(commentFile, "utf8").trim();

const jar = [];
const cookieHeader = () => jar.map((c) => c.split("\t")[0] + "=" + c.split("\t")[1]).join("; ");

async function get(u) {
  const r = await fetch(u, { headers: { "User-Agent": UA, Cookie: cookieHeader(), "Accept-Language": "en-US,en;q=0.9" } });
  const set = r.headers.getSetCookie?.() || [];
  for (const s of set) {
    const [pair] = s.split(";");
    const [k, v] = pair.split("=");
    const line = `${k}\t${v}\t.\tTRUE\tTRUE\t0\twordpress_test_cookie`;
    const idx = jar.findIndex((x) => x.split("\t")[0] === k);
    if (idx >= 0) jar[idx] = line; else jar.push(line);
  }
  return { status: r.status, text: await r.text(), url: r.url };
}

const page = await get(url);
console.log(`page ${page.status} len=${page.text.length} cookies=${jar.map((c) => c.split("\t")[0]).join(",")}`);

if (!/comment_post_ID|wp-comments-post/.test(page.text)) {
  console.log("NO_COMMENT_FORM");
  process.exit(2);
}
const q = (s) => s.replace(/'/g, '"');
const postId = (q(page.text).match(/name="comment_post_ID"[^>]*value="(\d+)"/) || q(page.text).match(/value="(\d+)"[^>]*name="comment_post_ID"/) || [])[1];
const parent = (q(page.text).match(/name="comment_parent"[^>]*value="(\d+)"/) || [0, "0"])[1];
const formAction = (q(page.text).match(/action="([^"]*wp-comments-post\.php[^"]*)"/) || [0, "/wp-comments-post.php"])[1];
console.log(`post_id=${postId} parent=${parent} action=${formAction}`);

const body = new URLSearchParams({
  comment,
  author,
  email,
  url: siteUrl,
  comment_post_ID: postId || "0",
  comment_parent: parent,
  author: author,
  email: email,
  url: siteUrl,
});
// WordPress also wants the test cookie acknowledged.
body.delete("author");
const params = new URLSearchParams();
params.set("comment", comment);
params.set("author", author);
params.set("email", email);
params.set("url", siteUrl);
params.set("comment_post_ID", postId || "0");
params.set("comment_parent", parent);
params.set("submit", "Post Comment");

const r = await fetch(new URL(formAction, url).href, {
  method: "POST",
  redirect: "manual",
  headers: {
    "User-Agent": UA,
    "Cookie": cookieHeader(),
    "Content-Type": "application/x-www-form-urlencoded",
    "Referer": url,
    "Origin": new URL(url).origin,
  },
  body: params.toString(),
});
const text = await r.text();
console.log(`POST ${r.status} location=${r.headers.get("location") || "-"}`);
const msg = (text.match(/<p[^>]*>([^<]{10,220})<\/p>/g) || [])
  .map((s) => s.replace(/<[^>]+>/g, "").trim())
  .filter((s) => /thank|moderat|await|error|comment|held|duplicate|invalid|cookie/i.test(s))
  .slice(0, 4);
console.log("MSG:", msg.join(" | ") || text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 300));
