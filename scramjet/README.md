# Hyper-Pop Scramjet Browser

This branch is a safe staging branch for the Scramjet browser migration. The existing Hyper-Pop files are preserved.

## Important hosting requirement

GitHub Pages only serves static files. Scramjet needs its built browser assets (including the WASM rewriter and service worker) and a Wisp-compatible WebSocket transport. The official Scramjet-App serves those assets and the Wisp endpoint from a Node.js server. Simply switching GitHub Pages to this branch will not make Scramjet work by itself.

Official upstream references:
- Scramjet engine: https://github.com/MercuryWorkshop/scramjet
- Official example app: https://github.com/MercuryWorkshop/Scramjet-App
- Example app deployment requirements: https://github.com/MercuryWorkshop/Scramjet-App#readme

## Migration plan

1. Build/package the official Scramjet assets for the Pages frontend.
2. Choose a free Wisp/WebSocket host that permits this traffic and configure its secure WebSocket endpoint (wss://).
3. Integrate the new browser shell into Hyper-Pop's existing proxy.html while retaining search, bookmarks, history, and shortcuts.
4. Test normal websites and YouTube on iPhone before changing the live Pages source.
5. Keep the current main branch untouched until the replacement passes tests.

## Free-tier and blocking limitations

No setup can guarantee unlimited free hosting or that networks and websites will never block the service. Scramjet's upstream project notes that YouTube reliability can be affected by hosting IP reputation and traffic volume. Do not put private keys in frontend files or Git history.
