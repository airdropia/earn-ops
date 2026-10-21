# Daejin: the 620 USDC bounty, and what the app actually asks for

The Superteam listing "Launch & Trade on Daejin" pays 620 USDC and closes on
the 23rd of October 2026. It is not regional, so anyone can enter. The brief
asks for four things:

1. A position of at least 5 USDC in one of the featured markets
   (https://www.daejin.xyz/prediction), with a screenshot and the reason for
   the Yes or No side.
2. A market of your own, which is free to create, with a clear question, a
   defined proof source and a resolution date, plus a screenshot. You cannot
   take a position in your own market.
3. A Twitter thread that explains how Daejin works: how a shared pool market
   forms its price and how the pool is split between the winners. A thread
   that only posts screenshots or a link is not judged.
4. The thread link and the market link submitted on Earn. The wallet address
   is collected with the submission, so it must not appear in the thread.

Scoring is out of 100: clarity 25 and hands on depth 25, reach 15 and
engagement rate 15. The engagement rate is measured against the follower
count, so a small account with real replies competes better than a large
account with passive reach. Buying views, engagement pods and giveaways are
disqualified, and the outcome of the market never matters.

## What the app asks of the browser

Daejin uses the Reown AppKit wallet stack. The sign in dialog has two
chains, and the notice in the dialog is important: "Markets settle on the
chain you sign in with. One at a time - connecting a second wallet does not
merge the two." So the position and the market have to live on the same
chain, and the listing is a Solana bounty, which means the Solana path is
the one that counts.

The Solana branch lists Phantom, Solflare and Backpack, and it reports "No
Solana wallet detected" when it finds nothing. That detection comes from the
Wallet Standard registry that lives inside the app's own JavaScript bundle,
not from `navigator.wallets`, so a wallet injected from the page stays
invisible. The tools/ego/phantom-inject.mjs script therefore builds a
Phantom compatible provider with a local keypair, but on this app it is only
useful for reading, not for connecting.

**The practical route:** sign in with a real Solana extension wallet, in a
browser where the extension is installed. Phantom, Solflare and Backpack are
the names the app lists, and the "Show all wallets instead" link opens the
full catalogue from the WalletConnect explorer.

## The cost

One position of 5 USDC, plus the gas for one position and one market
creation on Solana. The position stays with the trader, so it is a cost, not
a fee, and the prize is 620 USDC.
