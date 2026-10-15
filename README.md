# Pairfall

A calm, Zen Match–style pair-matching tile game for Android. Tap tiles into the
tray; two matching tiles clear each other. Too many unmatched tiles waiting and
the level is lost. Every level is generated, and every level can be won.

## Install on your phone

1. On your Android phone, open
   **https://github.com/moulik1111aa/pairfall/releases/latest/download/Pairfall.apk**
   (this link always gives the newest version).
2. Open the downloaded file. If Android asks, allow installs from your browser
   (only the first time), then tap **Install**.
3. To update later, do the same again. Updates install over the old version and
   keep your progress.

## How it's built

- `src/` — the game (TypeScript, no runtime dependencies), bundled by
  `scripts/build.mjs` into one self-contained `dist/index.html`.
- `native/android/` — Pairfall's Android code and resources (plugin, icons,
  splash), layered onto a fresh Capacitor project by `scripts/android.mjs`.
- `.github/workflows/build-apk.yml` — builds, signs and publishes the APK on
  every push to `main`.
- `docs/superpowers/` — the design spec and implementation plan.

```sh
npm run typecheck && npm test   # unit tests
npm run build                   # dist/index.html
npm run e2e                     # browser tests (Playwright)
npm run gencheck                # 10,000-seed generator check
npm run icons                   # re-render launcher icons (needs sharp)
```

Signing: the release keystore is stored encrypted in
`native/android/pairfall-release.jks.gpg`; the `PAIRFALL_SIGNING_PASSWORD`
repository secret unlocks it. Keep a private backup of the keystore and its
password — every update must be signed with the same key.
