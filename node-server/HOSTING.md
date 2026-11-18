# Hyper-Pop Universal Node Hosting Kit

This kit has one application server and two deployment profiles:

- **Native Node profile:** for providers that run a normal Node.js app from `package.json`, including Bonto-style personal instances.
- **Docker profile:** for hosts that build a Dockerfile or run Docker Compose. This profile includes Debian tools and build-time APT packages.

The same `server.js`, Supabase account verification, persistent project storage, API routes, and preview proxy are used in both profiles. Provider-specific dashboards and limits are not hidden behind fake compatibility switches.

## Important hosting model

This is a **personal Node server instance**, not a public multi-tenant hosting service. The current server is designed to run one Hyper-Pop project at a time per server instance. Give each owner their own deployed instance and private setup key. Do not share one instance's setup key between unrelated users.

Bonto is documented as a personal/single-user option. It is not presented as a shared multi-user host. A larger provider does not automatically make this server multi-tenant; multi-user isolation, quotas, and per-user process management would require a separate architecture.

Project files are persisted through the configured Supabase storage function. A host's local filesystem is treated as runtime scratch space.

## Provider compatibility

| Provider type | Profile | What works | Important limits |
| --- | --- | --- | --- |
| Bonto personal Node app | Native Node | Node app, npm dependencies, environment variables, HTTP health route, Supabase-backed project files | Personal/single-user deployment. No Docker image or APT/root package installation assumed. Child-process execution must be allowed by the provider. |
| Render Docker service | Docker | Full image, Debian packages, Node/npm, health check, APT bridge inside the image | Render controls sleep, memory, runtime hours, and networking on each plan. |
| Render native Node service | Native Node | Node/npm app and Supabase-backed storage | No root, Docker, or APT capability assumed. |
| Other managed Node hosts | Native Node | Any host providing Node 26+, npm install, a start command, outbound HTTPS, and child processes | Provider must permit spawning project processes and proxying preview traffic. |
| Docker VPS / container host | Docker | Most complete environment, including build-time APT packages | You manage Docker, firewall, TLS/reverse proxy, updates, and backups. |
| Docker PaaS | Docker | Same image and health endpoint | Confirm Dockerfile builds, writable temporary storage, child processes, and exposed HTTP port are supported. |

Compatibility is capability-based, not brand-based. A host that only supports serverless functions or edge workers is not a direct fit for this long-running Express server and its child processes.

## Native Node deployment

Use this when the provider offers a standard Node application runtime.

1. Set the app's root directory to `node-server/` if the provider supports monorepo subdirectories. Otherwise, upload the **contents** of `node-server/` into the app's root directory.
2. Select Node.js 26 or a newer compatible LTS/current release.
3. Set the install/build command to `npm install --omit=dev` (or let the provider auto-install from `package.json`).
4. Set the start command to `npm start`.
5. Configure these private environment variables:

   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `HP_STORAGE_URL`
   - `HP_NODE_SETUP_KEY`

6. Let the provider inject `PORT`. Do not hard-code a public port in the native app settings.
7. Set the health-check path to `/health`, if supported.
8. Deploy, then open `https://YOUR-APP-HOST/health`. A healthy response contains `"ok":true`.

### Bonto personal instance

Bonto fits the native Node profile, with the important distinction that it is intended here as a **single-user/personal server**.

- Deploy one instance for the one Hyper-Pop owner who will claim it.
- Use the Node app's Git deployment or upload the contents of `node-server/` as the app root.
- Keep the four environment values private.
- Use `npm start` and the provider-assigned `PORT`.
- Test `/health`, then test account claim, project creation, npm install, project start, and preview.
- Do not expect the Dockerfile's Debian packages, `sudo`, or APT bridge to work in the native profile.

The server has been adjusted so its project-file ownership and child-process options do not require root when running as a normal unprivileged Node process. That improves native-host compatibility, but it does **not** bypass provider restrictions. If Bonto blocks child processes, long-running child processes, or local preview proxy traffic, the full terminal project runner cannot work there without a provider-specific redesign.

## Docker deployment

Use Docker when you need a predictable Linux userspace and build-time system packages.

- Docker context: `node-server/`
- Dockerfile: `node-server/Dockerfile`
- Container HTTP port: `10000`
- Health check: `GET /health`
- Compose file: `node-server/docker-compose.yml`

For local Docker Compose:

```bash
cp .env.example .env
# Edit .env and set the four required private values.
docker compose up --build -d
docker compose logs -f
curl http://localhost:10000/health
```

For a managed Docker host, configure the same context, Dockerfile, environment values, and health path. Let the provider map its public port to the container's port `10000`.

Permanent operating-system packages belong in the Dockerfile's `apt-get install` list. Rebuild after changing that list. Runtime APT changes are temporary and may disappear when a container is replaced.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL used for account verification |
| `SUPABASE_ANON_KEY` | Yes | Supabase publishable/anon key |
| `HP_STORAGE_URL` | Yes | Hyper-Pop persistent project storage endpoint |
| `HP_NODE_SETUP_KEY` | Yes | Private setup/claim key for this server instance |
| `PORT` | Provider supplies | HTTP listen port; local/Docker default is 10000 |
| `NODE_ENV` | No | Defaults to production |

Never put a Supabase service-role key or the setup key in browser code or commit a real `.env` file.

## Verification checklist

After deploying on a new host, test in this order:

1. `GET /health` responds with HTTP 200 and `ok: true`.
2. Hyper-Pop can connect to the server URL.
3. The owner can claim the instance with the private setup key.
4. The owner can create a project and its files survive a server restart/redeploy.
5. `npm install` works inside a project.
6. A project can start and remain running.
7. The preview URL can reach the project.
8. Logs and stop/restart actions work.
9. A second project is correctly rejected while the first is running, because this instance currently allows one active project at a time.

If steps 5–8 fail on a native host, check its policy for child processes, long-running processes, outbound network access, and reverse-proxy paths before treating the provider as compatible.

## Adding another provider

Do not fork `server.js` just to add a host. First classify the host as native Node or Docker, then fill in its deployment-specific settings:

- app/root directory
- Node version or Docker context
- install and start commands
- environment variable names
- exposed port and health-check path
- support for child processes and preview proxying
- persistent storage expectations
- sleep, CPU, memory, and runtime limits

Add provider-specific instructions to this document. Only add a separate config file when the provider actually requires one. Keep the root repository `render.yaml` and the existing `node-server/render.yaml` Render Blueprint separate.
