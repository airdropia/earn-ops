// Find omi bounty proposals that are still genuinely open.
//
// The naive check ("does the issue have comments?") is wrong. What matters is
// whether any pull request that claims the bounty actually landed. A bounty
// whose claiming pull request was closed without merging is still free, and so
// is one whose claim never produced a pull request that is open or merged.
//
// Usage:
//   node tools/omi-free-bounties.mjs            # print the free proposals
//   node tools/omi-free-bounties.mjs --json     # machine readable

const REPO = "BasedHardware/omi";
const API = "https://api.github.com";
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

const api = async (path) => {
  const res = await fetch(API + path, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "User-Agent": "omi-free-bounty-scanner",
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(path + " -> " + res.status + " " + text.slice(0, 160));
  return JSON.parse(text);
};

// 1. every open issue that looks like a bounty proposal
const open = await api(`/repos/${REPO}/issues?state=open&per_page=100&sort=created&direction=desc`);
const proposals = open.filter((i) => !i.pull_request && /bounty/i.test(i.title || ""));
console.log(`open bounty-looking issues: ${proposals.length}`);

// 2. every pull request number referenced from a proposal body or comment
const free = [];
for (const issue of proposals) {
  const body = issue.body || "";
  const referenced = new Set();
  // The claim can be written as "#1234" or as a full pull URL, and the
  // auto-generated proposals use the URL form, so both must be caught.
  const claimPatterns = [
    /(?:implementation pr|pull request|fix submitted in|submitted in|resolves?|closes)[^\n]{0,40}?#(\d+)/gi,
    /(?:implementation pr|pull request|fix submitted in|submitted in|resolves?|closes)[^\n]{0,60}?\/pull\/(\d+)/gi,
    /\/pull\/(\d+)/g,
  ];
  for (const rx of claimPatterns) {
    for (const m of body.matchAll(rx)) referenced.add(Number(m[1]));
  }
  let comments = [];
  if (issue.comments > 0) {
    comments = await api(`/repos/${REPO}/issues/${issue.number}/comments?per_page=100`);
    for (const c of comments) {
      const text = c.body || "";
      for (const m of text.matchAll(/(?:fix submitted in|submitted in|pull request|opened pr|pr)\s*:?\s*#(\d+)/gi)) {
        referenced.add(Number(m[1]));
      }
      for (const m of text.matchAll(/\/pull\/(\d+)/g)) referenced.add(Number(m[1]));
    }
  }

  // 3. resolve each referenced pull request: only an open or merged one blocks
  let blockedBy = null;
  const seen = [];
  for (const n of referenced) {
    try {
      const pr = await api(`/repos/${REPO}/pulls/${n}`);
      seen.push(`#${n}:${pr.state}${pr.merged_at ? "/merged" : ""}`);
      if (pr.state === "open" || pr.merged_at) {
        blockedBy = `#${n} (${pr.merged_at ? "merged" : "open"})`;
        break;
      }
    } catch {
      seen.push(`#${n}:missing`);
    }
  }

  const amount = ((body.match(/\$\s?[\d,]+(?:\s*-\s*\$?[\d,]+)?/g) || [])[0] || "?").trim();
  const files = [...new Set([...body.matchAll(/`([^`]*\.(?:py|ts|tsx|dart|swift))`/g)].map((m) => m[1]))].slice(0, 5);
  if (!blockedBy) {
    free.push({
      number: issue.number,
      title: issue.title,
      amount,
      files,
      created: issue.created_at.slice(0, 10),
      comments: issue.comments,
      referenced: [...referenced],
      referencedState: seen,
      url: `https://github.com/${REPO}/issues/${issue.number}`,
    });
  }
}

free.sort((a, b) => b.number - a.number);
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ scanned: proposals.length, free }, null, 2));
} else {
  console.log(`\nPROPOSALS WITH NO LIVE CLAIM: ${free.length}`);
  for (const f of free) {
    console.log(`\n#${f.number} ${f.amount} created ${f.created} comments=${f.comments}`);
    console.log(`  ${f.title.slice(0, 100)}`);
    if (f.files.length) console.log(`  files: ${f.files.join(", ")}`);
    if (f.referencedState.length) console.log(`  claims seen: ${f.referencedState.join(" ")}`);
    console.log(`  ${f.url}`);
  }
}
