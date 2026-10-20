#!/usr/bin/env bun
// Second elizaOS contribution, shipped the same way: GitHub API only, no
// clone, no local build. Issue #37035: plugin-elizacloud stores the title
// "Image Analysis" when a vision model answers with a bold "**Title:** ...".
import { readFileSync } from "node:fs";

const FORK = "airdropia/eliza";
const UPSTREAM = "elizaOS/eliza";
const BRANCH = "fix/elizacloud-image-description-title";
const BASE = "develop";
const T = (s) => Buffer.from(s, "utf8").toString("base64");

const api = async (method, path, body) => {
  const r = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
      "User-Agent": "vectorforge-agent",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const t = await r.text();
  let j;
  try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 300) }; }
  if (!r.ok) throw new Error(`${method} ${path} -> ${r.status} ${JSON.stringify(j).slice(0, 300)}`);
  return j;
};

const base = await api("GET", `/repos/${FORK}/git/ref/heads/${BASE}`);
try {
  await api("POST", `/repos/${FORK}/git/refs`, { ref: `refs/heads/${BRANCH}`, sha: base.object.sha });
  console.log("branch created");
} catch (e) { console.log("branch:", e.message.slice(0, 100)); }

// --- the fix ---------------------------------------------------------------
const helperPath = "plugins/plugin-elizacloud/src/utils/helpers.ts";
const cur = await api("GET", `/repos/${FORK}/contents/${helperPath}?ref=${BRANCH}`);
let source = Buffer.from(cur.content, "base64").toString("utf8");

const OLD = `export function parseImageDescriptionResponse(responseText: string): ImageDescriptionResult {
  const titleMatch = responseText.match(/^Title:[ \\t]*([^\\r\\n]+)/i);
  const title = titleMatch?.[1]?.trim() || "Image Analysis";

  return { title, description: responseText };
}`;

const NEW = `export function parseImageDescriptionResponse(responseText: string): ImageDescriptionResult {
  // Vision models often answer with a bold label, for example
  // "**Title:** Red jacket at the zoo". The plain label, the bold label and
  // the bold label with a space before the colon are all accepted, and the
  // emphasis marks around the title value are removed.
  const titleMatch = responseText.match(/^[ \\t]*\\**[ \\t]*Title[ \\t]*\\**[ \\t]*:[ \\t]*([^\\r\\n]+)/i);
  const title =
    titleMatch?.[1]?.trim().replace(/^\\*+|\\*+$/g, "").trim() || "Image Analysis";

  return { title, description: responseText };
}`;

if (!source.includes(OLD)) { console.error("ANCHOR NOT FOUND in helpers.ts"); process.exit(1); }
source = source.replace(OLD, NEW);
console.log("fix applied");

// --- the regression test ---------------------------------------------------
const testPath = "plugins/plugin-elizacloud/__tests__/image-description-title.test.ts";
const test = `import { describe, expect, it } from "vitest";
import { parseImageDescriptionResponse } from "../src/utils/helpers";

describe("parseImageDescriptionResponse", () => {
  it("reads the title from a bold label", () => {
    const result = parseImageDescriptionResponse(
      "**Title:** Red jacket at the zoo\\n\\nA man stands by an enclosure."
    );
    expect(result.title).toBe("Red jacket at the zoo");
  });

  it("still reads the title from a plain label", () => {
    const result = parseImageDescriptionResponse(
      "Title: Red jacket at the zoo\\n\\nA man stands by an enclosure."
    );
    expect(result.title).toBe("Red jacket at the zoo");
  });
});
`;

// --- the focused workflow ---------------------------------------------------
const workflowPath = ".github/workflows/elizacloud-image-description-title.yml";
const workflow = `name: elizacloud image description title

on:
  push:
    branches:
      - "${BRANCH}"
  pull_request:
    branches:
      - ${BASE}

jobs:
  regression:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.3.0"
      - name: Install workspace dependencies
        run: |
          bun install --frozen-lockfile --ignore-scripts
          bun packages/scripts/ensure-workspace-symlinks.ts
      - name: Run the image description title test
        working-directory: plugins/plugin-elizacloud
        run: |
          cat > vitest.config.focus.ts <<'FOCUS'
          import fs from "node:fs";
          import path from "node:path";
          import base from "./vitest.config";

          const elizaRoot = path.resolve(import.meta.dirname, "../..");

          const workspaceSource = {
            name: "eliza-workspace-source",
            enforce: "pre" as const,
            resolveId(source: string) {
              const match = /^@elizaos\/([^/]+)(?:\\/(.+))?$/.exec(source);
              if (!match) return null;
              const [, pkg, sub] = match;
              const srcRoot = path.join(elizaRoot, "packages", pkg, "src");
              const candidates = sub
                ? [
                    path.join(srcRoot, \`\${sub}.ts\`),
                    path.join(srcRoot, sub, "index.ts"),
                    path.join(srcRoot, sub),
                  ]
                : [path.join(srcRoot, "index.ts")];
              for (const candidate of candidates) {
                if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
                  return candidate;
                }
              }
              return null;
            },
          };

          export default {
            ...base,
            plugins: [...(base.plugins ?? []), workspaceSource],
          };
          FOCUS
          bunx vitest run --config ./vitest.config.focus.ts __tests__/image-description-title.test.ts
`;

// --- push ------------------------------------------------------------------
const put = async (path, content, message) => {
  let sha;
  try { sha = (await api("GET", `/repos/${FORK}/contents/${path}?ref=${BRANCH}`)).sha; } catch {}
  const res = await api("PUT", `/repos/${FORK}/contents/${path}`, {
    message, content: T(content), branch: BRANCH, ...(sha ? { sha } : {}),
  });
  console.log("committed:", path, res.commit.sha.slice(0, 8));
};

await put(helperPath, source, "fix(elizacloud): read the image description title from a bold label");
await put(testPath, test, "test(elizacloud): cover the bold image description title label");
await put(workflowPath, workflow, "ci: run the image description title test for this fix");
console.log("head sha:", (await api("GET", `/repos/${FORK}/git/ref/heads/${BRANCH}`)).object.sha);
