const task = await taskSpace("earn-lane-2026-10-20");
const page = task.page("p1");
const ROOT = "C:/Users/Admin/Desktop/Best/auto-earn-engine/pins/";
const MAKER = "https://airdropia.github.io/auto-earn-engine/maker/";
const BASE = "https://airdropia.github.io/auto-earn-engine";
const PINS = [
  { id: "memorial-angel-dc48f5b4", title: "In Loving Memory Angel Wings Shadow Box SVG", desc: "Angel wings memorial shadow box with an editable name plate. Type their name free, no account needed." },
  { id: "memorial-rainbow-fe2903d5", title: "Rainbow Bridge Pet Memorial Shadow Box SVG", desc: "Rainbow bridge pet memorial shadow box, 7 layers, editable name plate. Free browser maker, no signup." },
  { id: "memorial-sunset-1fae76b7", title: "Sunset Remembrance Shadow Box | Editable Name Plate", desc: "Purple sunset memorial shadow box with editable name plate for Cricut. Free maker, download a preview." },
  { id: "memorial-forest-b9150cdc", title: "Forest Leaf Memorial Shadow Box SVG | 7 Layers", desc: "Leaf motif memorial shadow box with editable name plate. Type their name, see it free." },
  { id: "memorial-ocean-268aea3f", title: "Ocean Waves Remembrance Shadow Box SVG | 7 Layers", desc: "Wave motif memorial shadow box with 7 layers, editable name plate. Free maker, no signup." },
  { id: "memorial-candle-e25d93bd", title: "Candle in Memory Shadow Box SVG | Editable Name", desc: "Candle memorial shadow box with editable name plate for Cricut and Silhouette." },
  { id: "memorial-star-9e0acda5", title: "Star Memorial Shadow Box SVG | A Star In Our Sky", desc: "Star motif memorial shadow box with editable name plate. Free browser maker." },
  { id: "memorial-cross-c677d337", title: "Cross Remembrance Shadow Box SVG | 7 Layers", desc: "Cross memorial shadow box with editable name plate. Free maker, no account." },
];

const pierce = (fn, arg) => page.evaluate(fn, arg);

for (const pin of PINS) {
  try {
    await page.goto("https://www.pinterest.com/pin-creation-tool/");
    await page.waitForTimeout(7000);
    const fileOk = await pierce(() => {
      function deep(root, f) { f(root); const els = root.querySelectorAll("*"); for (const e of els) if (e.shadowRoot) deep(e.shadowRoot, f); }
      let f = null;
      deep(document, (r) => { for (const i of r.querySelectorAll('input[type=file]')) { f = i; break; } });
      if (!f) return "no-file";
      f.setAttribute("data-agent", "file");
      return "ok";
    });
    if (fileOk !== "ok") { console.log(pin.id, "FILE", fileOk); continue; }
    await page.setInputFiles('input[data-agent="file"]', [ROOT + pin.id + "-pin.png"]);
    await page.waitForTimeout(9000);

    await page.fill('input[placeholder="Tell everyone what your Pin is about"]', pin.title);
    await page.fill('input[placeholder="Add a link"]', MAKER);
    await pierce((desc) => {
      function deep(root, f) { f(root); const els = root.querySelectorAll("*"); for (const e of els) if (e.shadowRoot) deep(e.shadowRoot, f); }
      let el = null;
      deep(document, (r) => { for (const d of r.querySelectorAll('[aria-label="Describe your Pin"],[contenteditable="true"]')) { el = d; break; } });
      if (!el) return "no-desc";
      el.focus();
      el.innerText = desc;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      return "ok";
    }, pin.desc);

    // Board picker: open with the keyboard, filter, choose.
    const bpos = await pierce(() => {
      function deep(root, f) { f(root); const els = root.querySelectorAll("*"); for (const e of els) if (e.shadowRoot) deep(e.shadowRoot, f); }
      let hit = null;
      deep(document, (r) => {
        for (const e of r.querySelectorAll("*")) {
          const t = (e.innerText || "").trim();
          if (/^(Seamless Patterns for Designers|Cricut Ideas & Cut Files|Printable Planners & Tra|Free Mandala SVG Files)$/.test(t) && e.children.length === 0) { hit = e; break; }
        }
      });
      if (!hit) return "not-found";
      const el = hit.closest('[role=button],button') || hit;
      el.focus();
      return "focused";
    });
    if (bpos === "focused") {
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1200);
      await page.keyboard.type("Cricut");
      await page.waitForTimeout(2200);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1200);
    }

    const pub = await pierce(() => {
      function deep(root, f) { f(root); const els = root.querySelectorAll("*"); for (const e of els) if (e.shadowRoot) deep(e.shadowRoot, f); }
      let b = null;
      deep(document, (r) => { for (const x of r.querySelectorAll("button")) if ((x.innerText || "").trim() === "Publish") { b = x; break; } });
      if (!b) return "no-publish";
      if (b.disabled) return "disabled";
      b.click();
      return "clicked";
    });
    await page.waitForTimeout(11000);

    // Read the newest pin from the created tab.
    await page.goto("https://www.pinterest.com/x2newd/_created/");
    await page.waitForTimeout(7000);
    const found = await pierce((title) => {
      function deep(root, f) { f(root); const els = root.querySelectorAll("*"); for (const e of els) if (e.shadowRoot) deep(e.shadowRoot, f); }
      let best = null;
      deep(document, (r) => {
        for (const a of r.querySelectorAll('a[href*="/pin/"]')) {
          const t = (a.innerText || "").trim();
          const href = a.getAttribute("href") || "";
          if (t && title.toLowerCase().slice(0, 20) && t.toLowerCase().includes(title.toLowerCase().slice(0, 20)) && !best) best = href;
        }
      });
      return best || "not-found";
    }, pin.title);
    console.log(pin.id, "->", pub, found);
  } catch (e) {
    console.log(pin.id, "ERROR", e.message.slice(0, 120));
  }
}
