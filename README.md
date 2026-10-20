# Earn Ops

The machine that turns a coding agent into USDC. Everything here runs on
GitHub: the local machine only sends text.

## The verified earning lanes (measured 2026-10-20)

| Lane | Pay rail | Real money? | What blocks it |
|---|---|---|---|
| **elizaOS (Slop pool)** | USDC, monthly pool, cap $1,000 | Promised; `paymentMode: disabled`, `committed: 0` so far | Maintainer merge + first cycle |
| **Slop itself (`SlopDotCash/slopdotcash`)** | USDC on Solana, monthly pool, cap $1,000 | Promised; `paymentMode: disabled` | Same |
| **Clustly marketplace** | USDC on Solana, 1 USDC per job, 48h auto-approve | Live listings, instant payout | Account: Privy, email login disabled, needs Google/Twitter/wallet |
| **Agent Bounties (Base USDC)** | USDC on Base | `verification_not_ready` - the platform itself says do not work them | Verification profiles unavailable |
| **Superteam Earn** | USDC, $500-$6,000 per bounty | Real payouts to real people | Twitter OAuth |
| **Augora** | - | Titles say $45-$100, contributors report **0 USDC** | Pays nothing |
| **Lilly Protocol** | Stripe (fiat) | Open settlement requests are unpaid | Not crypto, not paid |
| **Senthemodder** | USDC escrowed | Every bounty has 4-5 competing PRs and none is merged | Maintainer never merges |
| **Codeberg** | - | Behind Anubis proof-of-work | Bot gate |
| **WordPress.com / Substack / Dev.to** | - | IP rate limit / Privy email disabled / ES modules | Account walls |

**The one lane that needs nothing from a human: a GitHub account plus a
merged pull request on a Slop-funded repository.** That is the machine this
repo runs.

## Rules that keep the contributions acceptable

From the target repositories' own contribution guides:

1. Star and fork the repository first - it is required for project tracking.
2. Stay inside the approved scope; a maintainer confirms the scope in the
   issue before work starts.
3. Accepted work: a reproduced defect, a real end-to-end test, a security
   fix, input validation at a real boundary, or a measured quality gain with
   before-and-after numbers.
4. Not accepted: UI, visual, style or copy changes, features without an
   approved plan, busywork tests, mock-only proof, placeholder code,
   unverified claims, duplicate pull requests, secrets in commits.
5. Use real model calls and record the provider and the exact model id.
6. Every pull request links the exact PRD requirement and MVP work package.

## Operating loop

1. `bounty-watch.yml` (daily) lists the open issues in the funded
   repositories and the state of our own pull requests, and opens a digest
   issue in this repository. Nothing gets missed.
2. For a chosen issue: comment the plan in the issue, work in a fork branch
   that targets `develop`, and open the pull request with evidence.
3. `regression.yml` runs the focused test for the branch in the fork, so the
   proof is a green run, not a claim.
4. When the maintainer merges, the work is an accepted outcome and it
   shares the monthly pool.

## Shipped so far

| Pull request | Issue | Proof |
|---|---|---|
| [elizaOS/eliza#37158](https://github.com/elizaOS/eliza/pull/37158) | #37039 - a rate-limited stream attempt recorded as a successful empty call | [run](https://github.com/airdropia/eliza/actions/runs/39440621851) - 13 tests passed |
| [elizaOS/eliza#37161](https://github.com/elizaOS/eliza/pull/37161) | #37035 - the image description title is lost when the model writes a bold label | [run](https://github.com/airdropia/eliza/actions/runs/39445841085) - 2 tests passed |

Both pull requests target develop, follow the repository pull request template with all seven evidence rows, and carry a green regression run instead of a claim.

The payout rail of the pool is USDC on Solana, so a Solana address is needed to receive it.
