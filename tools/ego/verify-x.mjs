// Verify the X account of the signed in profile on Superteam Earn.
//
// The submit button of a listing stays disabled until the X account that
// posts the work is verified. This runs that authorisation. The scope is read
// only: users.read, tweet.read, offline.access.
const task = await taskSpace("earn-lane-2026-10-20");
const page = task.page("p1");
await page.goto("https://superteam.fun/earn/listing/chimp-on-metaplex");
await page.waitForTimeout(6000);
await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.innerText.trim() === "Submit Now");
  if (b) b.click();
});
await page.waitForTimeout(4000);
console.log("verify:", await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.innerText.trim() === "Verify");
  if (!b) return "no-verify-button";
  b.click();
  return "clicked";
}));
await page.waitForTimeout(6000);
await page.click('loc=role:button[name="Authorize app"]').catch((e) => console.log("click failed: " + e.message.slice(0, 100)));
await page.waitForTimeout(10000);
console.log("landed:", await page.evaluate(() => location.href + " | " + (document.body.innerText || "").split("\n")[0]));
