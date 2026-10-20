// Submit work to a Superteam Earn listing.
//
// Usage: set SLUG, LINK and NOTE, then run
//   ego-browser nodejs < tools/ego/submit-bounty.mjs
const SLUG = "chimp-on-metaplex";
const LINK = "https://x.com/1SawaLi/status/REPLACE_ME";
const NOTE = "";

const task = await taskSpace("earn-lane-2026-10-20");
const page = task.page("p1");
await page.goto(`https://superteam.fun/earn/listing/${SLUG}`);
await page.waitForTimeout(6000);
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.innerText.trim() === "Submit Now");
  if (b) b.click();
});
await page.waitForTimeout(4000);
await page.fill('input[name="link"]', LINK);
if (NOTE) {
  await page.evaluate(() => {
    const t = [...document.querySelectorAll("textarea")].filter((x) => x.placeholder !== "Write a comment")[0];
    if (t) t.setAttribute("id", "agent-note");
  });
  await page.click("#agent-note").catch(() => {});
  await page.keyboard.insertText(NOTE);
}
await page.waitForTimeout(1200);
const state = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /Submit using/i.test(x.innerText));
  return { label: b?.innerText, disabled: b?.disabled, link: document.querySelector('input[name="link"]')?.value };
});
console.log("form:", JSON.stringify(state));
if (state.disabled) {
  console.log("the submit button is disabled: the X account is probably not verified yet");
  process.exit(1);
}
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /Submit using/i.test(x.innerText));
  b.click();
});
await page.waitForTimeout(9000);
console.log(
  "result:",
  await page.evaluate(() =>
    (document.body.innerText || "").split("\n").filter((l) => /Submission Received|submitted|error/i.test(l)).slice(0, 3).join(" | ")
  )
);
