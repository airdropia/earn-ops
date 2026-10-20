// Post a thread on X as a chain of replies.
//
// The web composer replaces the previous text instead of adding a block, so a
// thread is built by posting the first tweet and then replying to the tweet
// before it. Keep a tweet under 265 characters when it is a reply, because
// the reply prefix counts towards the 280 character limit.
//
// Usage: change SPACE, TWEETS and the account handle, then run
//   ego-browser nodejs < tools/ego/post-thread.mjs
import { readFileSync, writeFileSync } from "node:fs";

const SPACE = "earn-lane-2026-10-20";
const TWEETS = JSON.parse(readFileSync("TWEETS_FILE", "utf8"));
const OUT = "POSTED_FILE";

const weighted = (t) => t.replace(/https?:\/\/\S+/g, "x".repeat(23)).length;
for (const [i, t] of TWEETS.entries()) {
  if (weighted(t) > 275) {
    console.log(`tweet ${i + 1} is ${weighted(t)} characters, too long`);
    process.exit(1);
  }
}

const task = await taskSpace(SPACE);
const page = task.page("p1");
const posted = [];

for (const [i, text] of TWEETS.entries()) {
  if (i === 0) {
    await page.goto("https://x.com/compose/post");
    await page.waitForTimeout(5000);
  } else {
    await page.goto(`https://x.com/i/status/${posted[posted.length - 1]}`);
    await page.waitForTimeout(5000);
    const opened = await page.evaluate(() => {
      const art = [...document.querySelectorAll("article")][0];
      const btn = art?.querySelector('[data-testid="reply"]');
      if (!btn) return "no-reply-button";
      btn.click();
      return "clicked";
    });
    if (opened !== "clicked") {
      console.log(`tweet ${i + 1}: ${opened}`);
      break;
    }
    await page.waitForTimeout(4000);
  }
  await page.evaluate(() => document.querySelector('div[data-testid="tweetTextarea_0"]')?.focus());
  await page.keyboard.insertText(text);
  await page.waitForTimeout(1600);
  let result = "disabled";
  for (let attempt = 0; attempt < 3; attempt++) {
    const disabled = await page.evaluate(() => document.querySelector('[data-testid="tweetButton"]')?.disabled);
    if (!disabled) {
      await page.evaluate(() => document.querySelector('[data-testid="tweetButton"]')?.click());
      result = "posted";
      break;
    }
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(5500);
  const id = await page.evaluate((head) => {
    for (const a of [...document.querySelectorAll("article")]) {
      if ((a.innerText || "").includes(head)) {
        const link = [...a.querySelectorAll('a[href*="/status/"]')]
          .map((x) => x.getAttribute("href"))
          .find((h) => /^\/[A-Za-z0-9_]+\/status\/\d+$/.test(h));
        if (link) return link.split("/").pop();
      }
    }
    return "not-found";
  }, text.slice(0, 40));
  console.log(`tweet ${i + 1}: ${result} id=${id}`);
  if (id !== "not-found") posted.push(id);
  writeFileSync(OUT, JSON.stringify(posted, null, 1));
}
console.log("thread root: https://x.com/" + (posted[0] || "?"));
