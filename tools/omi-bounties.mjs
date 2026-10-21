// Find the open omi bounty proposals that nobody has taken yet.
//
// The omi repository publishes paid bounty proposals as issues. A proposal is
// a real cash lane: the payout rail named in the proposal body is an EVM
// USDC address on Base, so a merged fix is paid in USDC with no account, no
// KYC and no captcha.
//
// A proposal is considered taken when any of these is true:
//   - its body names an implementation pull request
//   - a sibling issue titled "fix: resolve issue #N" exists
//   - somebody commented a claim on it
//   - it carries the bounty claim label
//
// Usage:
//   node tools/omi-bounties.mjs            # print the free proposals
//   node tools/omi-bounties.mjs --json     # machine readable output

const REPO = "BasedHardware/omi";
const API = "https://api.github.com";
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

const api = async (path) => {
  const res = await fetch(API + path, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + token,
      "User-Agent": "omi-bounty-scanner",
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(path + " -> " + res.status + " " + text.slice(0, 160));
  return JSON.parse(text);
};

const labels = await api("/repos/" + REPO + "/labels?per_page=100");
const bountyLabelIds = new Set(labels.filter((l) => /bounty|reward/i.test(l.name)).map((l) => String(l.id)));

const candidates = new Map();
for (let page = 1; page <= 4; page++) {
  const batch = await api(`/repos/${REPO}/issues?state=open&per_page=100&page=${page}&sort=created&direction=desc`);
  if (!batch.length) break;
  for (const issue of batch) {
    const hasLabel = (issue.labels || []).some((l) => bountyLabelIds.has(String(l.id)));
    const looksLikeProposal = /bounty proposal|bounty\]/i.test(issue.title || "");
    if (hasLabel || looksLikeProposal) candidates.set(issue.number, issue);
  }
}

const recent = await api(
  `/repos/${REPO}/issues?state=all&per_page=100&sort=created&direction=desc&since=${new Date(Date.now() - 1000 * 60 * 60 * 24 * 45).toISOString()}`,
);
const fixIssues = recent.filter((i) => /^fix: resolve issue #/i.test(i.title || ""));

const free = [];
for (const issue of candidates.values()) {
  const body = issue.body || "";
  const implPr =
    body.match(/Implementation PR[^#\n]*#(\d+)/i) ||
    body.match(/Pull Request[^#\n]*pull\/(\d+)/i) ||
    body.match(/fix submitted in #(\d+)/i);
  const sibling = fixIssues.find((x) => new RegExp(`resolve issue #${issue.number}\\b`, "i").test(x.title || ""));
  const claimLabel = (issue.labels || []).some((l) => /claim/i.test(l.name));
  const claimed = Boolean(implPr || sibling || claimLabel || issue.comments > 0);
  const amount = (body.match(/\$\s?[\d,]+(\s*-\s*\$?[\d,]+)?/g) || []).slice(0, 2).join(" to ");
  const rail = (body.match(/Designated Payout Rail[\s\S]{0,220}/i) || [""])[0].replace(/\s+/g, " ");
  const railAddress = (rail.match(/0x[0-9a-fA-F]{40}/) || [""])[0];
  const files = [...new Set([...body.matchAll(/`([^`]*\.(?:py|ts|tsx|dart|swift))`/g)].map((m) => m[1]))].slice(0, 6);
  free.push({
    number: issue.number,
    title: issue.title,
    amount: amount || null,
    files,
    railAddress,
    claimed,
    reason: implPr
      ? "implementation PR #" + implPr[1]
      : sibling
        ? "sibling fix issue #" + sibling.number
        : claimLabel
          ? "claim label"
          : issue.comments > 0
            ? issue.comments + " comments"
            : null,
    url: "https://github.com/" + REPO + "/issues/" + issue.number,
  });
}

const unclaimed = free.filter((f) => !f.claimed).sort((a, b) => b.number - a.number);
if (process.argv.includes("--json")) {
  console.log(JSON.stringify({ scanned: free.length, unclaimed }, null, 2));
} else {
  console.log("omi bounty proposals: " + free.length + " open, " + unclaimed.length + " unclaimed");
  for (const f of unclaimed) {
    console.log(
      "\n#" + f.number + " " + f.title + "\n  amount: " + (f.amount || "?") + "\n  files: " + (f.files.join(", ") || "-") + "\n  " + f.url,
    );
  }
}
