const task = await taskSpace("earn-lane-2026-10-20");
const page = task.page("p1");
await page.goto("https://www.pinterest.com/pin/1133499800008952942/");
await page.waitForTimeout(9000);
console.log(await page.evaluate(() => {
  function deep(root, f) { f(root); const els = root.querySelectorAll("*"); for (const e of els) if (e.shadowRoot) deep(e.shadowRoot, f); }
  const links = [], boards = [], text = [];
  deep(document, (r) => {
    for (const a of r.querySelectorAll("a")) {
      const h = a.href || "";
      const t = (a.innerText || "").trim().slice(0, 40);
      if (/airdropia|maker/i.test(h + t)) links.push(h + " | " + t);
      if (/\/x2newd\/[a-z-]+$/.test(a.getAttribute("href") || "")) boards.push((a.getAttribute("href") || "") + " | " + t);
    }
    for (const p of r.querySelectorAll("p,span,div")) { const t = (p.innerText || "").trim(); if (t && t.length < 120 && /memorial|shadow box|free maker|7 layers/i.test(t)) text.push(t.slice(0, 110)); }
  });
  return JSON.stringify({ links: [...new Set(links)].slice(0, 6), boards: [...new Set(boards)].slice(0, 6), text: [...new Set(text)].slice(0, 6) }, null, 1);
}));
