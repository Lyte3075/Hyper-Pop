# SCRAMJET - STATIC

### Build 2.0 (NEWEST PROGRAM VERSION/BUILD LANCHED JULY 12 '26 )
**Created & Maintained by:** hahahah67-pixel
  ORIGINAL scramjet-static public program creation date:
June 11, 2026 (6/11/26)

---
align="center"><img src="https://raw.githubusercontent.com/hahahah67-pixel/scramjet-static-demo-build/main/transport/scramjett.png" height="200"></p>

## 🚀 About the Project

This is a static build of the **Scramjet** internet proxy, originally developed by **MercuryWorkshop**. This deployment is powered by a public WISP libcurl URL provided by **aura.pro**. 

This static variant is built on Scramjet version 1.10 and utilizes the core engine components directly from the official Scramjet Example-App, allowing it to remain entirely static. This is meant to be a static SJ engine meant for public deployment and use, if you like this project please use it yourself in public deployment.

---

## 🤝 Credits & Acknowledgments

* **MercuryWorkshop:** For creating the Scramjet proxy, supplying the essential engine files, and developing the WISP server and libcurl transport layers utilized by Scramjet.
* **Aura Team:** For hosting and providing the public WISP/libcurl server that `SJ-static` connects to, keeping this project serverless and static.

---

## File Structure

```
scramjet-static/
│
├── index.html
├── sw.js
├── about.md
├── README.md
├── LICENSE
├── .nojekyll
│
├── wisp.txt
├── transport.txt
├── release-notes.txt
│
├── scramjet-engine/
│   ├── scramjet.js
│   ├── scramjet-all.js
│   ├── scramjet-sync.js
│   └── scramjet.wasm
│
├── bare-mux/
│   ├── bare-mux.js
│   └── bare-mux-worker.js
│
├── transport/
│   ├── libcurl.mjs
│   ├── epoxy.mjs
│   ├── scramjett.png
│   ├── preview 1.png
│   ├── preview 2.png
│   ├── preview 3.png
│   ├── preview 4.png
│   └── preview 5.png
│
└── .github/
    ├── ISSUE_TEMPLATE/
    │   ├── bug_report.md
    │   └── config.yml
    │
    └── workflows/
        ├── docker-image.yml
        └── eslint.yml
```


## 📄 License & Legal

* **License:** This project and the open-source technologies it utilizes are licensed under the **AGPL 3.0 Public License**.
* **Inquiries:** For legal questions or copyright inquiries, please refer to dmca.com.

---

## VERSION 2.0 UPGRADES! 🏆 we are proud to release version 2 of this project, furthering development of this custom scarmjet proxy engine for static usage, we hope people build off, and deploy this in production. It is the best static interpertacion of scramjet so far* built from the ground up! 🏆🏆🏆🏆🏆🏆🏆🏆🏆

## IMPROVMENTS INCLUDE:
- Rebuilt back/forward navigation to reliably return home without falling through to the browser's own history
- Fixed a service worker race condition that could cause the app to hang on "Writing config…" after a reload
- Added a persistent WISP server settings panel — set and save a custom WISP server directly from the home screen, no redeployment needed
- Added live transport method switching between libcurl and epoxy — swap transports without reloading the page, your WISP server carries over automatically
- Added real, verifiable transport confirmation — open DevTools and inspect the <html> tag's data-active-transport attribute to see which transport is actually handling requests, read straight from bare-mux's own internal state, not just what the UI claims
- Added a real animated loading progress bar for page navigation
- Added floating reload and home controls, including live network-loss detection during reload with a clear "no internet" message
- Added an About page (about.md) linked from the home screen, plus a build version label
- Added fork-friendly configuration — wisp.txt and transport.txt at the repo root let anyone who forks the project set their own default WISP server or transport method just by editing a text file, no code changes required
- Added a one-time "Welcome to Scramjet STATIC v2" release popup with full changelog, shown on first visit to this version
- Added confetti celebration animation on the home screen for the v2 launch
- Fixed home screen footer text (build label and About link) remaining visible through the proxy iframe instead of being hidden while browsing
- General stability improvements across service worker registration, IndexedDB handling, and transport initialization
- Full firefox support is now added, expoy transport enables compatibility with Firefox.

  ---
  ## HERE ARE SOME IMAGES OF SJ-STATIC V.2 SHOW CASING A VERSION PREVIEW:


align="center"><img src="https://raw.githubusercontent.com/hahahah67-pixel/scramjet-static-demo-build/main/transport/preview 1.png" height="200"></p>

align="center"><img src="https://raw.githubusercontent.com/hahahah67-pixel/scramjet-static-demo-build/main/transport/preview 2.png" height="200"></p>

align="center"><img src="https://raw.githubusercontent.com/hahahah67-pixel/scramjet-static-demo-build/main/transport/preview 3.png" height="200"></p>

align="center"><img src="https://raw.githubusercontent.com/hahahah67-pixel/scramjet-static-demo-build/main/transport/preview 4.png" height="200"></p>

align="center"><img src="https://raw.githubusercontent.com/hahahah67-pixel/scramjet-static-demo-build/main/transport/preview 5.png" height="200"></p>

---
all open-source services are used under accaptable and law-binding copyright and lisences, Scramjet-static is lisenced under the APGL 3.0 public lisence, for lisence info vist /LICENSE on this web domain.
for more information, please vist dmca.com
