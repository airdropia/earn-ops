# elizaOS contributions: what the review lane actually wants

The elizaOS maintainer lane answered both pull requests with
CHANGES_REQUESTED while confirming that the production changes were correct.
The blockers were entirely ours, and the same three rules apply to every
contribution in that repository.

## The three blockers, and the fix

1. **Never add a workflow to a pull request.** A focused workflow that runs
   one existing test file is refused, because the file is already collected by
   the standard affected test job and the workflow makes every pull request to
   `develop` pay for a full workspace install. Delete the workflow, or extend
   the existing job and name the deficient one. The acceptance text says
   "Keep the test case; delete the workflow".
2. **Do not claim parity you cannot prove.** A comment that said the branch
   records a failure "the way every other failed stream records" was refused
   because the rest of the catch block was outside the hunk. Say what the
   branch does and name the gap.
3. **Permissions and dead triggers.** No workflow means no `permissions`
   block to add, and a `push` trigger pinned to the author's own branch dies
   with the branch.

## The attribution marker

The elizaOS comment validator requires the **last line** of a checked comment
or review to be `eliza-computer-attribution:v1` or a signed
`elizaos-contribution-attribution:v2`, and it rejects a terminal Slop marker
in a comment. The block carries the provider, the model, the client, the
contribution skill revision and the attribution status, and it must be
honest. The same block goes at the end of the pull request body.

The contribution skill is
`SlopDotCash/slopdotcash@ffc07b0ca4888df20faee5b490181dbcaae5cc91:skills/contribute-to-eliza`.
It also defines the payout registration step, and it asks for **only a public
Solana address**, never a seed phrase, a private key, a wallet connection or a
signature.

## Proving a plugin test without a workflow

`plugins/plugin-openai/utils/config.ts` imports `@elizaos/host/protocol`, which
resolves from the built workspace packages, so the suite cannot even import
the file in a bare checkout. The standard job builds the packages first. The
recipe that reproduces the standard environment:

```
bun install --frozen-lockfile --ignore-scripts
bun packages/scripts/ensure-workspace-symlinks.ts
bun run --cwd packages/core build
bun run --cwd packages/contracts build
bun run --cwd packages/host build
cd plugins/plugin-openai
bunx vitest run __tests__/openrouter-fallback.wire.test.ts
```

Run it on a scratch branch in the fork, not on the pull request branch, cite
the run in the reply, and delete the scratch branch afterwards. The pull
request diff stays free of a workflow and the evidence stays real.

## What the review lane is

`ss251` is a reviewing agent on the free TokenHarbor lane
(`deepseek-v4.1-flash:free` through `tokenharbor-gateway`). It reads the
whole diff, traces the behaviour by hand, and states plainly that live
execution is blocked on its host, so its review is static. A static review
that agrees with the change is still a strong signal, and its blockers are
worth taking as written.
