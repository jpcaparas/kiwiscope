# Security

## Electron hardening

KiwiScope is an offline game. The renderer process is locked down:

- **No remote content.** The app only loads its bundled `dist/index.html`. Navigation, `<webview>` and new windows are all blocked in the main process.
- **Isolation.** `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. The preload script exposes a frozen, read-only object (platform and version strings) and nothing else.
- **Content Security Policy.** Only `'self'` for scripts, plus `data:`/`blob:` for generated textures and audio. No `eval`, no inline scripts, no third-party origins.
- **Permissions.** Every permission request is denied except pointer lock and fullscreen.
- **No network access at runtime.** No telemetry, no update checks, no analytics.
- **Supply chain.** Dependencies are pinned to exact versions, `package-lock.json` is committed, CI installs with `npm ci`, and GitHub Actions are pinned to commit SHAs.

## Unsigned builds

Release binaries are ad-hoc signed on macOS and unsigned on Windows. Check downloads against the `SHA256SUMS.txt` attached to each release:

```bash
shasum -a 256 -c SHA256SUMS.txt --ignore-missing
```

## Reporting a vulnerability

Please use [GitHub private vulnerability reporting](https://github.com/jpcaparas/kiwiscope/security/advisories/new) instead of opening a public issue.
