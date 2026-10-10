# Cloudflare hosting investigation

This directory documents the Cloudflare option for the Hyper-Pop Scramjet browser.

## Important compatibility finding

Cloudflare Pages can serve the browser UI and static Scramjet assets, but it cannot by itself provide the network transport Scramjet needs.

MercuryWorkshop's `wisp-server-workers` is a Cloudflare Workers implementation of Wisp, but its own README says it is intended for small API clients that do not need many parallel requests or open connections and explicitly warns against using it for other purposes. A browser engine needs many concurrent connections, so we should not treat this as a proven replacement for the Node Wisp server.

Upstream reference: https://github.com/MercuryWorkshop/wisp-server-workers

## Safe next steps

1. Keep the existing Hyper-Pop site and `main` branch unchanged.
2. Do not point the live browser at a Cloudflare Wisp endpoint until it passes multi-connection tests on iPhone.
3. First test the official Scramjet example and transport locally or in a disposable staging environment.
4. If the Cloudflare Worker transport cannot handle normal browsing reliably, stop rather than ship a broken browser. A different compatible transport host or a different browser architecture will be needed.

## Free-tier expectations

No hosting arrangement can guarantee unlimited usage, universal website compatibility, or that websites and networks will never block it. Never put private API keys in frontend code or commit them to Git.
