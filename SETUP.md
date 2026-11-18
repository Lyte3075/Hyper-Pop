# Hyper-Pop Setup Guide

A detailed guide to running, configuring, developing, and self-hosting Hyper-Pop.

> **Project status:** Hyper-Pop is a collection of browser-based experiences with shared account/social services and an optional personal Node.js project server. Not every feature is independently self-hostable yet. Read the service requirements below before expecting a complete local clone to behave exactly like the hosted site.

## Contents

- [1. What you are setting up](#1-what-you-are-setting-up)
- [2. Choose an installation type](#2-choose-an-installation-type)
- [3. Requirements](#3-requirements)
- [4. Get the source code](#4-get-the-source-code)
- [5. Run the website locally](#5-run-the-website-locally)
- [6. Publish the static website](#6-publish-the-static-website)
- [7. Accounts and Supabase](#7-accounts-and-supabase)
- [8. Social features](#8-social-features)
- [9. Voice calls and browser permissions](#9-voice-calls-and-browser-permissions)
- [10. The personal Node.js server](#10-the-personal-nodejs-server)
- [11. Deploy the Node.js server](#11-deploy-the-nodejs-server)
- [12. Node server API reference](#12-node-server-api-reference)
- [13. Browser-local terminal](#13-browser-local-terminal)
- [14. Project structure](#14-project-structure)
- [15. Development workflow](#15-development-workflow)
- [16. Security and privacy](#16-security-and-privacy)
- [17. Troubleshooting](#17-troubleshooting)
- [18. Known limitations and current status](#18-known-limitations-and-current-status)

---

## 1. What you are setting up

Hyper-Pop is designed as a small, browser-first internet playground. The repository contains:

- A static website and shared navigation.
- Games, experiments, utilities, and standalone web experiences.
- Account registration and login.
- Profiles, leaderboards, friends, chat, and presence features.
- WebRTC voice-call clients and their signaling services.
- A browser-local terminal experience.
- A separate Node.js server for creating and running personal web projects.
- Supabase database functions and storage integrations used by hosted features.

The website and backend are separate parts:

| Part | What it does | Typical host |
|---|---|---|
| Static frontend | HTML, CSS, JavaScript, games, tools | GitHub Pages or another static host |
| Account/social backend | Accounts, sessions, profiles, social data, scores, signaling | Supabase |
| Personal Node server | Runs user-created Node projects and serves project APIs/previews | Bonto or another Node host |
| Browser storage | Local preferences, terminal filesystem, some game saves | The visitor's browser |

The public site currently linked by the project README is:

- GitHub Pages: https://lyte3075.github.io/Hyper-Pop/
- PNTR domain: https://hyper-pop.pntr.dev/

The repository's root `index.html` is the website entry point.

## 2. Choose an installation type

There are three different ways to use or run Hyper-Pop.

### A. Just visit Hyper-Pop

No installation is needed. Open one of the public website links above.

Some features require an account, microphone permission, or a reachable backend. Most standalone browser experiences do not need you to install Node.js.

### B. Run a local development copy

This is the easiest way to inspect and modify the frontend. You need Git and a local static web server. You do **not** need to run the personal Node server just to open ordinary HTML games and tools.

A local copy does not automatically create your own accounts/social backend. The frontend currently contains the hosted Supabase project configuration, so a local copy may still contact the project's configured backend.

### C. Self-host your own complete instance

This is the advanced route. You need to host the static website and configure your own backend services. The frontend, Supabase project, Edge Functions, storage buckets, and optional personal Node server must agree on their URLs and credentials.

Do not point a public self-hosted copy at someone else's production database unless you intentionally want it to share that service and its data.

## 3. Requirements

### For frontend development

- Git.
- A modern browser.
- A text editor.
- A local HTTP server (recommended).
- Internet access for external services and resources.

The frontend is primarily plain HTML, CSS, and JavaScript. It is not currently a conventional frontend build requiring a bundler before every launch.

### For the personal Node.js server

- Node.js 22 or newer.
- npm.
- A host that can run a persistent Node.js process.
- A reachable Supabase project configured for Hyper-Pop's storage function.
- Environment variables described in [the Node server section](#10-the-personal-nodejs-server).

The root `package.json` currently defines:

```json
{
  "scripts": {
    "start": "node node-server/server.js"
  },
  "engines": {
    "node": ">=22"
  },
  "dependencies": {
    "express": "^5.1.0"
  }
}
```

### For voice features

- HTTPS (or localhost during development).
- A browser with WebRTC support.
- A microphone and permission to use it.
- Network conditions that permit peer-to-peer WebRTC connections.

Voice calls may fail on restrictive networks even when chat works. The current clients use Google STUN servers for connection discovery. STUN alone does not guarantee a connection through every NAT or firewall; a TURN relay may be needed for broader compatibility.

## 4. Get the source code

The active development branch for this project is **`terminal`**.

Clone that branch:

```bash
git clone --branch terminal --single-branch https://github.com/Lyte3075/Hyper-Pop.git
cd Hyper-Pop
```

If you already cloned the repository:

```bash
git fetch origin
git switch terminal
git pull origin terminal
```

Keep your work on the branch you intend to deploy. The project may have other branches with different contents.

## 5. Run the website locally

### Option 1: Python's simple static server

From the repository root:

```bash
python3 -m http.server 8000
```

Open:

```text
http://localhost:8000/
```

Stop the server with `Ctrl+C`.

### Option 2: Node.js static server

You can use a simple static server package without changing the project's own server:

```bash
npx http-server . -p 8000
```

Then open `http://localhost:8000/`.

### Why use HTTP instead of opening index.html directly?

Opening files with a `file://` URL can break fetch requests, modules, service workers, and browser security features. Use localhost for development.

### What works locally?

- Static pages and games that only need browser APIs should work.
- Browser-local saves are stored in that browser profile and origin.
- Account, social, leaderboard, and voice features still depend on the configured remote services.
- The personal Node project manager requires its separate Node server.

A localhost copy has a different origin from the public site. Browser localStorage and IndexedDB data are not automatically shared between those origins.

## 6. Publish the static website

GitHub Pages can publish the repository directly from a branch.

1. Open the repository on GitHub.
2. Open **Settings → Pages**.
3. Under **Build and deployment**, select **Deploy from a branch**.
4. Select branch **`terminal`**.
5. Select folder **`/(root)`**.
6. Save and wait for the Pages deployment workflow to finish.
7. Open the URL shown in the Pages settings.

The root folder contains `index.html`, so it is the correct publishing folder for this layout.

You can check deployment progress in the repository's **Actions** tab. If a deployment fails, open the failed workflow run and inspect the build/deployment log rather than repeatedly pushing the same commit.

Official guide: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

### Custom domains

A `CNAME` file alone does not configure DNS or attach a custom domain. Set the domain in GitHub Pages settings and configure the DNS records with the domain provider. Do not change DNS records unless you know which service currently hosts the domain.

### Static hosting does not run Node.js

GitHub Pages serves static files. It does not run `node-server/server.js`, install npm packages for the server, or provide a persistent Node process. Keep the static site and Node server deployed as separate services.

## 7. Accounts and Supabase

Hyper-Pop's account client currently uses Supabase for account-related requests.

The current hosted frontend configuration points to this Supabase project URL:

```text
https://iapnejlttsqqefkpmelp.supabase.co
```

The frontend uses a Supabase **publishable** key. A publishable key is intended to be present in browser code; it is not a substitute for database security. Database access must be protected by correct policies and server-side validation.

### What the account system uses

The current client code calls database functions including:

- `hyperpop_signup`
- `hyperpop_login`
- `hyperpop_me`
- `hyperpop_logout`
- `hyperpop_submit_score`
- `hyperpop_set_avatar`

The account token is stored in the browser's localStorage under `hyperpop_token`. Treat it as a credential. Do not copy it into public bug reports, screenshots, source code, or chat messages.

### Use the existing hosted account backend

If you are only developing the frontend and intentionally want to use the existing hosted Hyper-Pop accounts, no separate Supabase project setup is required. Your browser copy will use the Supabase configuration already present in the client files.

Be aware that this means your local copy is not isolated: account activity and data requests go to the configured hosted project.

### Create your own Supabase backend

For an independent deployment:

1. Create a Supabase project.
2. Keep the project URL and publishable key available for frontend configuration.
3. Recreate the database schema, SQL functions, storage buckets, and Edge Functions required by the features you intend to enable.
4. Configure database permissions and Row Level Security (RLS) before exposing the project.
5. Update the Supabase URL and publishable key in the frontend service configuration.
6. Configure the personal Node server's environment variables to point to the same Supabase project.
7. Test account creation, login, session validation, profile updates, and logout before enabling social features.

**Important:** Creating an empty Supabase project is not enough. Hyper-Pop's database functions and Edge Functions are application-specific. The repository's `supabase/` folder contains configuration, but it should not be assumed to be a complete database export or a one-click migration for every hosted service. Inspect the SQL migrations and function source available in the repository before attempting a full independent backend deployment.

Never put a Supabase service-role key or other server secret in frontend JavaScript. Use a publishable key in browser code and keep privileged credentials in server-side secrets.

## 8. Social features

The Social Hub is available at:

```text
/social.html
```

The social client uses the account session token and the Supabase `hyperpop_social` RPC.

Features represented in the current client include:

- Searching for accounts.
- Sending, accepting, and declining friend requests.
- Friends lists and presence labels.
- Direct conversations and chat.
- Party/group conversations.
- Notifications and chat refresh behavior.

### To use social features

1. Open Hyper-Pop over HTTPS.
2. Create an account or sign in.
3. Open the Social Hub.
4. Search for another account by username.
5. Send a friend request.
6. The other account must accept before the friendship is established.
7. Open the conversation to chat.

Social features will not work correctly if the required database function or tables are missing, if the browser is signed out, or if the configured Supabase backend is unavailable.

## 9. Voice calls and browser permissions

Hyper-Pop has separate voice clients for direct calls, party calls, and group-chat calls.

The current clients use WebRTC for audio and Supabase Edge Functions for signaling. The signaling service exchanges connection information; the audio stream is intended to travel directly between participants when possible.

### Microphone setup

1. Open the site using HTTPS.
2. Sign in.
3. Open the relevant friend or party conversation.
4. Start the call.
5. Allow microphone access when the browser asks.
6. Use the call controls to mute or leave.

On iPhone, check the browser's microphone permission in iOS Settings if the prompt was previously denied. You may need to reload the page after changing permission.

### Network limitations

A successful signaling request does not guarantee that audio can connect. Some school, work, mobile, and public Wi-Fi networks restrict peer-to-peer traffic. A TURN server can relay audio when a direct path cannot be established, but it must be configured in the WebRTC client and backed by a reachable TURN service.

Do not publish TURN usernames, passwords, or time-limited credentials in frontend source code. Use a secure credential-generation endpoint if you add TURN support.

## 10. The personal Node.js server

The personal Node server is separate from the static website. It is used by the terminal/project tooling to manage user-created Node projects.

### Current implementation

- Entrypoint: `node-server/server.js`
- Start command: `npm start`
- Runtime: Node.js 22 or newer
- Framework: Express 5
- Port: reads `process.env.PORT`, with a fallback of `10000`
- Health endpoint: `GET /health`
- Persistent project metadata and file operations: Supabase Edge Function `hyperpop-node-storage`
- Local working directory: a temporary directory named `hyperpop-node-projects` under the operating system's temporary directory

The database-backed storage service is the persistence layer for project files. The Node process also uses local working files while installing and running projects. A host that clears temporary files on restart may require projects to be synchronized back from persistent storage before they run again.

### Required environment variables

Configure these in the Node host's private environment-variable settings, not in GitHub files.

| Variable | Required? | Purpose |
|---|---|---|
| `SUPABASE_URL` | Yes | Base URL of the Supabase project |
| `SUPABASE_ANON_KEY` | Yes | Supabase publishable/legacy anon key used by this server to call the project |
| `HP_STORAGE_URL` | Recommended | Full URL of the `hyperpop-node-storage` Edge Function |
| `HP_NODE_SETUP_KEY` | Depends on claim state | Setup key passed to the storage claim operation when claiming an unclaimed server |
| `PORT` | Usually supplied by host | Port the hosting platform assigns to the process |

Example values (replace the project-specific values with your own):

```env
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
HP_STORAGE_URL=https://YOUR_PROJECT_REF.supabase.co/functions/v1/hyperpop-node-storage
HP_NODE_SETUP_KEY=YOUR_PRIVATE_SETUP_KEY
```

Do not commit a real setup key, access token, database password, service-role key, or other secret to Git. Do not paste secrets into public issues.

### Configure the storage Edge Function

The Node server expects a Supabase Edge Function at:

```text
/functions/v1/hyperpop-node-storage
```

That function is responsible for persistent ownership and project/file storage operations. The server also calls the `hyperpop_me` RPC to validate Hyper-Pop sessions.

For a separate Supabase project, deploy and configure a compatible version of the storage function and create the required schema before pointing the Node server at it. The function and database schema are application-specific; do not assume the hosted project's tables will appear automatically in a new project.

### Health check

After deployment, open:

```text
https://YOUR_NODE_HOST/health
```

A healthy response looks similar to:

```json
{
  "ok": true,
  "service": "hyperpop-node-server",
  "runtime": "v22.x.x",
  "projects": "persistent"
}
```

This only verifies that the Node process is responding. It does **not** prove that Supabase authentication, project storage, package installation, or project previews are all working.

## 11. Deploy the Node.js server

### Deploy on Bonto

The current project has been run on Bonto using the repository's `terminal` branch.

General deployment steps:

1. Create a Node.js application in Bonto.
2. Connect the Git repository `Lyte3075/Hyper-Pop`.
3. Select branch `terminal`.
4. Use the repository root as the application root.
5. Use Node.js 22 or newer.
6. Install dependencies with `npm install`.
7. Set the start command to `npm start`.
8. Add the environment variables from the previous section in Bonto's environment settings.
9. Deploy the application.
10. Open `/health` on the assigned Bonto URL.

The root `package.json` currently starts `node-server/server.js`, so the root is significant. If you deploy only the `node-server/` directory as the application root, the root package file will not be present there unless you also provide a package file in that directory or change the deployment configuration.

Bonto's exact dashboard labels and limits can change. Check its current Node.js hosting documentation before choosing resource settings.

### Deploy on another Node host

Use a host that supports long-running Node.js web services and provides a port through the `PORT` environment variable.

Minimum configuration:

- Runtime: Node.js 22+
- Working directory: repository root
- Install command: `npm install`
- Start command: `npm start`
- Health check path: `/health`
- Environment variables: the values listed above

The repository also contains a `render.yaml` file. Review it before using it as a deployment blueprint: its current `rootDir` is `node-server`, while the current `package.json` and start script are at the repository root. Those paths must be reconciled for a successful deployment.

### Keep the frontend and Node server URLs in sync

The frontend's Node tooling must send requests to the public URL of your Node server. If you host your own copy, locate the Node API base URL in the relevant terminal/client source and update it to your server's HTTPS URL. Do not change the Supabase URL to the Node server URL; they are different services.

After changing the URL, test the health check and then test sign-in, server claim/status, project creation, file operations, install/start/stop, and preview access.

## 12. Node server API reference

The current Express server defines these routes:

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Process health check |
| GET | `/api/me` | Return the signed-in Hyper-Pop account/server state |
| POST | `/api/claim` | Claim the personal server for the authenticated account |
| POST | `/api/system/apt` | Request a system package operation |
| POST | `/api/system/exec` | Run a system command operation |
| GET | `/api/projects` | List projects |
| POST | `/api/projects` | Create a project |
| DELETE | `/api/projects/:slug` | Delete a project |
| GET | `/api/projects/:slug/files` | Read/list project files |
| PUT | `/api/projects/:slug/files` | Write project files |
| DELETE | `/api/projects/:slug/files` | Delete project files |
| POST | `/api/projects/:slug/install` | Install project dependencies |
| POST | `/api/projects/:slug/start` | Start a project |
| POST | `/api/projects/:slug/stop` | Stop a project |
| GET | `/api/projects/:slug/status` | Read project runtime status |
| POST | `/api/projects/:slug/npm` | Run an npm operation |

Most project and account routes require a Hyper-Pop session token in the Authorization bearer header. The browser client is responsible for attaching the signed-in session token.

**Security warning:** The current server is a personal project runner, not a hardened multi-tenant hosting platform. It includes system-command/package-management operations and project execution. Do not expose it to untrusted users or use it to run code you do not trust. Review and harden route authentication, authorization, process isolation, resource limits, rate limits, and command allow-lists before making it a public shared service.

## 13. Browser-local terminal

The repository contains a separate browser terminal at:

```text
/terminal.html
```

It is not the same thing as the personal Node server.

The browser terminal is a simulated/local browser environment with a filesystem stored in browser storage (OPFS where supported). It is intended to provide a terminal-like workspace in the browser. It does not automatically grant access to the visitor's computer's real filesystem or operating-system shell.

### Important distinctions

- Browser terminal files belong to that browser and site origin.
- Clearing browser site data can remove local terminal files.
- A local development origin and the public site have separate browser storage.
- The personal Node server is a separate remote service used for project execution.
- Do not assume a command in the browser terminal is a real Linux command unless that command is implemented by the terminal itself.

Open the terminal page over HTTP/HTTPS rather than `file://`.

## 14. Project structure

The following are important top-level paths in the current repository:

| Path | Role |
|---|---|
| `index.html` | Main homepage |
| `style.css` | Shared styling |
| `app.js` | Shared page loader and site-wide UI initialization |
| `sidebar.html` | Sidebar/navigation UI |
| `site-sidebar.js` | Sidebar behavior |
| `account.js` | Shared account client |
| `accounts.html` | Account registration/login UI |
| `social.html` | Social Hub |
| `social.js` | Friends, presence, chat, and social client |
| `chat-widget.js` | Chat interface |
| `voice-call.js` | Direct voice-call client |
| `party-voice.js` | Party voice client |
| `group-voice.js` | Group-chat voice client |
| `leaderboard.html` | Leaderboard page |
| `terminal.html` | Browser-local terminal |
| `terminal.js` | Command Prompt easter egg and commands |
| `node-server/server.js` | Personal Node.js server |
| `package.json` | Node server package metadata and start script |
| `supabase/` | Supabase project configuration and function settings |
| `render.yaml` | Render deployment blueprint (review before use) |
| `sw.js` | Service worker |
| `manifest.webmanifest` | Web app manifest |
| `icon.svg` | Site icon |

Games and tools are distributed across standalone HTML files and folders. Examples include `skyliner.html`, `maze-of-shadows.html`, `hyper-craft.html`, `clicker.html`, `snake.html`, `pong.html`, `chess/`, `gl/`, `orbit/`, and other directories. The homepage is the best current directory of experiences.

## 15. Development workflow

### Make a change

1. Switch to the intended development branch (the current project workflow uses `terminal`).
2. Pull the latest version before editing.
3. Edit the smallest number of files needed.
4. Test the affected page locally.
5. Check the browser console for errors.
6. Commit with a message describing the actual change.
7. Push to the branch.
8. Check the relevant deployment service.

### Example Git workflow

```bash
git switch terminal
git pull origin terminal
# Edit files
git status
git add path/to/changed-file
git commit -m "Describe the change"
git push origin terminal
```

### Frontend testing checklist

- Open the changed page directly.
- Test on a narrow/mobile viewport.
- Test keyboard and touch interactions when relevant.
- Check relative links and asset paths.
- Check browser console and network errors.
- Test signed-out and signed-in states for account-dependent UI.
- Confirm that unrelated pages still load.

### Backend testing checklist

- Check `/health`.
- Check environment-variable presence without printing secret values.
- Test session validation with a real signed-in account.
- Test persistent storage reads and writes.
- Test project creation, install, start, stop, and preview.
- Inspect host logs after failures.
- Verify that a restart does not lose data that should be persistent.

## 16. Security and privacy

- Treat account tokens as passwords.
- Never commit service-role keys, database passwords, setup keys, TURN credentials, or private tokens.
- Browser publishable keys are public by design; database policies must still restrict what users can read and change.
- Keep privileged Supabase credentials server-side.
- Use HTTPS for account and microphone features.
- Do not expose the personal Node server to untrusted people. It can install dependencies and execute user project code.
- Do not run untrusted projects on a machine containing personal files or credentials.
- Use process/container isolation and resource limits if you experiment with public project execution.
- Review database RLS policies and Edge Function authorization before deploying a separate backend.
- Back up important project data before database migrations or destructive changes.

## 17. Troubleshooting

### The homepage works, but account login does not

- Confirm that the browser has internet access.
- Check the browser console and Network panel for failed Supabase requests.
- Confirm that the configured Supabase project is available.
- Confirm that the required RPC functions exist in that project.
- Check that the browser is not blocking storage or scripts.

### The local site works, but the public site does not

- Confirm GitHub Pages is publishing from the correct branch and folder.
- Open the repository's Actions tab and inspect the latest Pages deployment.
- Check relative paths and filename capitalization. GitHub Pages hosting is case-sensitive.
- Remember that a `CNAME` file does not configure DNS by itself.

### The Node server returns `Route not found` at /

That is expected if the server has no homepage route. Test `/health` instead.

### The Node server health check works, but projects do not

A healthy process does not prove that storage is configured. Check:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `HP_STORAGE_URL`
- The `hyperpop-node-storage` Edge Function
- The `hyperpop_me` RPC
- The authenticated account session
- Host logs for the failed request

Do not paste environment-variable values into a public issue. Share only the variable names and redacted error messages.

### The server says it is not claimed or storage is unavailable

- Sign in to the same Hyper-Pop account that owns the server.
- Confirm that the storage Edge Function is deployed and reachable.
- Confirm that the Node server is configured for the same Supabase project as the account system.
- Confirm that the owner record and storage schema exist.
- If the server has already been claimed, do not repeatedly attempt a first-time claim with random setup keys.

### Voice connects but there is no audio

- Check microphone permission.
- Check that the browser is using HTTPS.
- Check device output volume and silent mode.
- Close other applications using the microphone.
- Try another network.
- Remember that a STUN-only connection can fail on restrictive networks; TURN may be required.

### Browser terminal files disappeared

- Check whether browser site data was cleared.
- Check whether you changed from the public site to localhost or another domain.
- Check browser support for the required storage APIs.
- Do not treat browser-local storage as a cloud backup.

## 18. Known limitations and current status

This guide describes the current repository structure and integrations. It is not a claim that every feature is a one-click independent installation.

Current practical boundaries:

- The static website can be hosted separately from the Node server.
- The frontend account client currently points at the project's configured Supabase backend.
- A fully independent deployment needs the correct Supabase schema, RPC functions, storage buckets, and Edge Functions.
- Voice signaling and reliable cross-network audio require working signaling and, for some networks, TURN infrastructure.
- The personal Node server is a development/project runner and needs additional hardening before it is suitable for arbitrary public users.
- The Node server's temporary working directory is not the same thing as durable database-backed project storage.
- The browser terminal is separate from the remote Node server.
- Deployment files can become stale as hosting layouts change. Verify the actual package file, working directory, and start command before deploying.

If a setup step is missing or no longer matches the code, check the current source files and deployment logs before copying old instructions.

---

## Useful links

- [Hyper-Pop website](https://hyper-pop.pntr.dev/)
- [GitHub repository](https://github.com/Lyte3075/Hyper-Pop)
- [GitHub Pages settings](https://github.com/Lyte3075/Hyper-Pop/settings/pages)
- [GitHub Pages documentation](https://docs.github.com/en/pages)
- [Supabase documentation](https://supabase.com/docs)
- [Node.js documentation](https://nodejs.org/docs)
