#!/usr/bin/env node
// Superteam Earn agent tool.
//
// Implements the official agent contract from https://superteam.fun/skill.md:
// register, discover agent-eligible listings, read a listing contract, submit
// work, edit a submission, comment and answer a heartbeat.
//
// The API key is read from the environment (SUPERTEAM_AGENT_KEY). It is never
// written into the repository.
//
// Usage:
//   node tools/superteam-agent.js register <name>
//   node tools/superteam-agent.js listings [bounty|project|hackathon]
//   node tools/superteam-agent.js details <slug>
//   node tools/superteam-agent.js submit <listingId> --link <url> [--info <text>]
//   node tools/superteam-agent.js heartbeat
//
// A human still has to claim the payout. The claim code is printed by
// "register" and is redeemed at https://superteam.fun/earn/claim/<claimCode>.

const BASE = "https://superteam.fun";
const key = () => process.env.SUPERTEAM_AGENT_KEY || "";

async function api(method, path, body) {
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (key()) headers.Authorization = `Bearer ${key()}`;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`${method} ${path} -> ${res.status} ${JSON.stringify(data).slice(0, 400)}`);
  }
  return data;
}

const arg = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : fallback;
};

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "register": {
      const name = rest[0] || "vectorforge";
      const out = await api("POST", "/api/agents", { name });
      console.log(JSON.stringify(out, null, 2));
      console.log("\nGive this claim code to the human operator: " + out.claimCode);
      console.log("Claim page: " + BASE + "/earn/claim/" + out.claimCode);
      break;
    }
    case "listings": {
      const type = rest[0];
      const q = type ? `?take=50&type=${type}` : "?take=50";
      const out = await api("GET", "/api/agents/listings/live" + q);
      const rows = out.listings || out.data || out;
      if (!Array.isArray(rows)) {
        console.log(JSON.stringify(out, null, 2));
        break;
      }
      console.log(`${rows.length} agent-eligible listing(s)`);
      for (const l of rows) {
        console.log(
          `- [${l.agentAccess || "?"}] ${l.title} | ${l.rewardAmount} ${l.token || ""} | due ${String(l.deadline).slice(0, 10)} | ${l.slug}`
        );
      }
      break;
    }
    case "details": {
      const slug = rest[0];
      const out = await api("GET", "/api/agents/listings/details/" + slug);
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case "submit": {
      const listingId = rest[0];
      const payload = {
        listingId,
        link: arg("--link", ""),
        tweet: arg("--tweet", ""),
        otherInfo: arg("--info", ""),
        ask: arg("--ask", null),
        telegram: arg("--telegram", null),
        eligibilityAnswers: [],
      };
      const answers = arg("--answers", null);
      if (answers) payload.eligibilityAnswers = JSON.parse(answers);
      const out = await api("POST", "/api/agents/submissions/create", payload);
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case "update": {
      const listingId = rest[0];
      const payload = {
        listingId,
        link: arg("--link", ""),
        tweet: arg("--tweet", ""),
        otherInfo: arg("--info", ""),
        eligibilityAnswers: [],
      };
      const answers = arg("--answers", null);
      if (answers) payload.eligibilityAnswers = JSON.parse(answers);
      const out = await api("POST", "/api/agents/submissions/update", payload);
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case "comment": {
      const out = await api("POST", "/api/agents/comments/create", {
        refType: arg("--type", "BOUNTY"),
        refId: rest[0],
        message: arg("--message", ""),
        pocId: arg("--poc", null),
      });
      console.log(JSON.stringify(out, null, 2));
      break;
    }
    case "heartbeat": {
      console.log(
        JSON.stringify({
          status: "ok",
          agentName: arg("--name", "vectorforge"),
          time: new Date().toISOString(),
          version: "earn-agent-mvp",
          capabilities: ["register", "listings", "submit", "claim"],
          lastAction: arg("--last", "no action recorded"),
          nextAction: arg("--next", "poll listings"),
        })
      );
      break;
    }
    default:
      console.log("unknown command: " + cmd);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("ERROR " + err.message);
  process.exit(1);
});
