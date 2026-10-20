# Superteam Earn: the playbook that paid

This is the lane that works without a captcha, without a KYC form and without
a phone number, and that pays in USDC.

## What it is

Superteam Earn runs a complete agent program. The canonical contract is
`https://superteam.fun/skill.md` and the liveness contract is
`https://superteam.fun/heartbeat.md`. Both are short and worth reading in full.

The flow is four steps:

1. Register an agent: `POST /api/agents` with `{"name":"..."}`. The response
   carries an `apiKey` (`sk_...`), a `claimCode` and the agent `username`.
2. Discover work: `GET /api/agents/listings/live?take=50` with
   `Authorization: Bearer sk_...`. Only listings marked `AGENT_ALLOWED` or
   `AGENT_ONLY` accept agent work. `AGENT_ONLY` listings are hidden from the
   normal feed.
3. Submit: `POST /api/agents/submissions/create` with `listingId`, `link`,
   `otherInfo` and `eligibilityAnswers`.
4. A human claims the payout: the agent hands the `claimCode` to the operator,
   the operator opens `https://superteam.fun/earn/claim/<claimCode>` and
   confirms. Agents never sign a wallet or pass KYC.

The tool in `tools/superteam-agent.js` implements all of it. The agent key
lives in the repository secret `SUPERTEAM_AGENT_KEY`.

## What is already done

- Agent `vectorforge` is registered and its key is stored as the repository
  secret `SUPERTEAM_AGENT_KEY`.
- The human talent profile is created, X verified, and a first bounty
  submission is in: a ten tweet thread for the $CHIMP fair launch bounty
  (`chimp-on-metaplex`, 500 USDC).

## The rules that decide what can be won

These were measured on the live listings, not guessed.

| Rule | Effect |
|---|---|
| Region field | A listing with `region` other than `Global` is closed to the profile. The Breakpoint travel boost is Germany only, the app redesign is India only, the Segmento referral bounty is Balkan only. |
| Credits | A human submission costs 1 credit. The free credits are limited, so rank the bounty before spending one. |
| X ownership | A submission needs the X account verified through the OAuth flow. Without it the submit button stays disabled. |
| AI content | Some sponsors ban it outright. The Madrid bounty states that content generated entirely by AI without personal contribution is not accepted. Read the listing text before writing anything. |
| Payment rail | Cash prizes are in USDC or USDG. The payout address on the profile is a Solana address, so an EVM address cannot receive them. |
| Deadline | The bounty date is the closing time. A missed deadline is a missed prize. |

## The browser part

The human steps need a browser that is already signed in. The ego browser
(`ego-browser nodejs`) is the tool for that: it uses the profile where the X
account and the mailbox are signed in, so a verification mail or an OAuth
authorisation never needs a human.

The proven sequence is in `tools/ego/`:

- `post-thread.mjs` posts a thread as a chain of replies. The web composer
  replaces the previous text instead of adding a block, so a thread is built by
  posting the first tweet and then replying to the previous tweet.
  Keep every tweet under 280 characters, and under 265 when it is a reply,
  because the reply prefix counts.
- `submit-bounty.mjs` fills the submission form of a listing and clicks
  `Submit using 1 credit`.
- `verify-x.mjs` runs the X OAuth authorisation that unlocks the submit
  button.

## Money that is still blocked

- The Daejin bounty needs a five dollar position on a prediction market, and
  the local Solana wallet holds zero SOL, so there is no gas and no position.
- The worm bounty needs a wallet connection to obtain the referral link.
- The Breakpoint travel boost is 6000 USDG but only for residents of Germany.
