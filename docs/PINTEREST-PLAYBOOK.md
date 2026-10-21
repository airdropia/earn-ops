# Pinterest: the traffic lane, opened

Pinterest was the lane the whole project was aimed at, and it was blocked by
one thing only: the creator surface is behind a captcha that a fresh browser
profile cannot pass. The account was already there and signed in. The fix was
to drive the browser that holds the session.

## What is done

- The business account `@x2newd` (VectorForge Daily, id
  `1133499937372822102`) has the site claimed:
  `https://airdropia.github.io/auto-earn-engine/`.
- The full memorial pin set is published to the board
  `Cricut Ideas & Cut Files`, nine pins, every one linking to
  `https://airdropia.github.io/auto-earn-engine/maker/?utm_source=Pinterest&utm_medium=organic`.
- The pin list lives in `airdropia/auto-earn-engine` at `pins/published.json`,
  and the method is written up in `ops/pinterest-pins.md` in that repo.

## The claim, in short

1. Business Hub, `Claim your website`, method `Add HTML tag`.
2. The tag goes in the `<head>` of the page served at the domain root. The
   live site is a build artifact, so the tag is emitted by
   `pipeline/build_site.py`, not by a hand edit of `site/index.html`.
3. The domain field needs a trailing slash.
4. The claim shows up as the bare domain in the hub instead of the
   `claim ...` prompt.

## The build that was in the way

`weekly-compilation.yml` failed three runs in a row at the quality gate with
`PNG preview missing for ...svg`. The flagship workflow had a high resolution
PNG render step and the weekly workflow did not, so the weekly products never
got previews and the gate refused to publish. The same step now runs in the
weekly workflow, the build passes, and the site deploys again.

## Publishing pins

`tools/ego/pin-batch.mjs` publishes the whole set. Two traps:

- `Save from URL` cannot take a direct image URL. Pinterest tries to scrape a
  page and shows its sad puzzle image. Use the file picker with the local PNG.
- The board picker only opens with the keyboard: focus the board control,
  press Enter, type the board name, press Enter. A pointer click does nothing.
- Every new draft defaults to the first board, `Seamless Patterns for
  Designers`, so the board always has to be set.
