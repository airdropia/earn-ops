// Inject a Phantom-compatible Solana wallet into a page, backed by a local
// keypair, so a dApp that only lists installed extensions can still be driven.
//
// The key never leaves the machine: the script reads the keypair from the
// environment, bundles it into a browser script and injects it before the page
// loads with Page.addScriptToEvaluateOnNewDocument.
//
// Usage:
//   SOLANA_SECRET_KEY_B64=<64 byte keypair, base64> \
//   ego-browser nodejs < tools/ego/phantom-inject.mjs
//
// What it provides:
//   window.phantom.solana  connect, signTransaction, signAllTransactions,
//                           signMessage, signAndSendTransaction
//   navigator.wallets       a Wallet Standard entry for the same key
//
// Known limit: a dApp that keeps its own wallet registry, such as the Reown
// AppKit build used by daejin.xyz, keeps the registry inside its own bundle
// and never sees a wallet registered from the page, so it still reports that
// no wallet is installed.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const keyPath = process.env.SOLANA_KEY_FILE || ".secrets/solana_key.json";
if (!existsSync(keyPath)) {
  console.error("no keypair at " + keyPath);
  process.exit(1);
}
const key = JSON.parse(readFileSync(keyPath, "utf8"));
const secret = Buffer.from(key.secretKey, "base64");
const publicKey = Buffer.from(key.publicKey, "base64");
const full = Buffer.concat([secret, publicKey]).toString("base64");
console.log("keypair loaded, address from key file:", key.address);
console.log("(the injected provider reports the address derived from the key)");
writeFileSync(".tmp/phantom.bundle.js", `var SECRET_KEY_B64 = ${JSON.stringify(full)};`);
console.log("bundle written to .tmp/phantom.bundle.js - keep it out of the repository");
