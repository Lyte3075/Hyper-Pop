# Hyper-Pop Node Hosting Kit

A Docker-first Node.js hosting kit for Hyper-Pop Terminal. It packages Node 26, npm, Debian system tools, environment configuration, and a health endpoint so the same server can run on Docker-capable hosts.

## One-click Render Blueprint deployment

[Open the Render Blueprint dashboard](https://dashboard.render.com/blueprints)

1. In Render, choose **New → Blueprint** and connect this GitHub repository.
2. Select the `terminal` branch.
3. Set the Blueprint file path to `node-server/render.yaml`. This is deliberately separate from the repository's existing root `render.yaml`, so the current personal Node service is not replaced.
4. Render reads the Docker configuration and asks for the four private environment values:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `HP_STORAGE_URL`
   - `HP_NODE_SETUP_KEY`
5. Review the service named `hyper-pop-node-hosting-kit`, then click **Deploy Blueprint**.

Render builds the Docker image, installs the OS and npm packages, starts the server, and checks `/health`. The Blueprint uses the Virginia region and requests the free plan; provider plans and free-tier availability can change.

## Docker Compose: local or any Docker host

1. Install Docker Engine and the Docker Compose plugin.
2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and set the four required Hyper-Pop values. Generate a private setup key, for example with `openssl rand -hex 32`.
4. Build and start:

   ```bash
   docker compose up --build -d
   ```

5. Check status and logs:

   ```bash
   docker compose ps
   docker compose logs -f
   curl http://localhost:10000/health
   ```

To stop the service:

```bash
docker compose down
```

## Deploy on another Docker provider

Use the repository's `terminal` branch and set the service's Docker context to `node-server/` with `node-server/Dockerfile` as its Dockerfile. Expose HTTP port `10000`, then add the same environment variables listed below. Configure the provider's health check to request `/health`.

This works on hosts that accept Docker images, including self-hosted Docker servers and managed container platforms. The host still controls its own networking, storage, pricing, and runtime limits.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Yes | Supabase project URL for Hyper-Pop account verification |
| `SUPABASE_ANON_KEY` | Yes | Supabase publishable/anon key |
| `HP_STORAGE_URL` | Yes | Persistent Hyper-Pop project storage Edge Function |
| `HP_NODE_SETUP_KEY` | Yes | Private one-time server claim key |
| `PORT` | Host-dependent | HTTP port; defaults to `10000` |
| `NODE_ENV` | No | Defaults to `production` |

Do not put service-role keys in browser code. Keep the setup key private and rotate it if it is exposed.

## Automatic package installation

The Dockerfile installs Node 26 and npm from the official Node image, then installs the Debian starter packages with `apt-get` during the image build. It also installs the server's npm dependencies. These steps happen automatically when the host builds the image.

To add permanent operating-system packages, add their Debian package names to the Dockerfile's `apt-get install` list and rebuild. To add Node libraries used by the server itself, add them to `package.json` and rebuild.

Hyper-Pop projects can also install their own dependencies: when a project is started, the server checks for `node_modules` and runs `npm install` if needed. The project's own `package.json` declares its dependencies and start script.

Runtime APT changes are temporary and may disappear when a container is replaced. Put permanent system packages in the Dockerfile instead.

## Health checks

- HTTP endpoint: `GET /health`
- Docker image health check: enabled in the Dockerfile
- Docker Compose health check: enabled in `docker-compose.yml`
- Render health check: configured as `/health` in the Blueprint

A healthy response looks like:

```json
{"ok":true,"service":"hyperpop-node-server","runtime":"v26.x.x","projects":"persistent"}
```

## What persists?

Project files are stored through the configured Supabase storage function, not only in the container's temporary filesystem. Running processes and runtime-installed OS packages may be reset when a host restarts or replaces a container. Packages installed in the Dockerfile are rebuilt into the image and survive normal restarts.

## Native Node hosting vs Docker

- **Docker mode:** controls the Node runtime and Debian packages. Use this when you need `apt`, system tools, or a consistent environment.
- **Native Node mode:** uses the provider's Node runtime and build/start commands. It can run Node and npm dependencies, but cannot grant `sudo`, root, or `apt` access if the provider does not expose them.

No deployment file can grant Docker or root privileges on a host that does not offer those capabilities.
