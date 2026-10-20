# Tools

| File | What it does |
|---|---|
| `eliza-pr.js` | Ships an elizaOS fix straight from the GitHub API: creates the fork branch, writes the patched file, the regression test and the focused CI workflow, and opens the pull request. No clone and no local build. |
| `eliza-pr2.js` | The same flow for the `plugin-elizacloud` package. |
| `mailbox.js` | Reads the scriptable mail.tm inbox (confirmation links for platforms that do not need an account). |
| `imap.js` | A correct IMAP client for the Gmail inbox. The earlier script only inspected responses tagged `A001`, so it never reported a login result. |
| `chrome.sh` | Starts the open-source `chrome-headless-shell` for automation. |
| `comment-post.js` | Posts a reader comment on a public article through the site's own WordPress form. |
| `send-mail.js` | Sends a short inclusion pitch through the Guerrilla Mail API. |

Run them with bun. Secrets live in `.secrets/`, never in git.
