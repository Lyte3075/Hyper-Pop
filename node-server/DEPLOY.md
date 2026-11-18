# Hyper-Pop Personal Node Server: portable deployment

This folder can be deployed on more than one hosting platform. The server uses a standard Node.js start command and has a Docker image for hosts that support containers.

## Choose a runtime

### Option A: Docker (recommended)

Use this when the host supports Docker or a Dockerfile. This is the portable option for Debian/OS packages.

1. Copy `.env.example` to `.env`.
2. Fill in the Supabase URL, publishable/anon key, storage function URL, and a private setup key.
3. From this folder, run:

   ```bash
   docker compose up --build -d
   ```

4. Check the service:

   ```bash
   docker compose ps
   docker compose logs -f
   curl http://localhost:10000/health
   ```

The included Dockerfile installs the Debian starter packages during image build. To add permanent OS packages, add them to the Dockerfile's `apt-get install` list and rebuild the image. This is more reliable than installing packages into a running container.

### Option B: Managed Node.js runtime

For hosts that provide a Node.js runtime but do not support Docker:

- Build command: `npm install`
- Start command: `npm start`
- Health check: `/health`
- Node.js: 20 or newer
- Port: use the host-provided `PORT` environment variable

Set the same environment variables shown in `.env.example` in the host's dashboard.

A managed Node runtime can run Node.js and npm packages. It cannot automatically run `apt`, `sudo`, or install Debian system packages when the provider does not expose OS-level access. For those packages, use a Docker-capable host or the provider's documented build-package mechanism.

## Required configuration

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL used for Hyper-Pop account verification |
| `SUPABASE_ANON_KEY` | Supabase publishable/anon key |
| `HP_STORAGE_URL` | Hyper-Pop Node project storage Edge Function |
| `HP_NODE_SETUP_KEY` | Private one-time server claim key |
| `PORT` | HTTP port supplied by the host |

Do not put service-role keys in browser code. Keep the setup key private and rotate it if it is exposed.

## What persists?

Project files are stored through the configured Supabase storage function, not just in the container's temporary filesystem. Running processes and installed OS packages are runtime resources and may be reset when a host restarts or replaces a container. Packages installed in the Dockerfile are rebuilt into the image and therefore survive normal restarts.

## Provider compatibility model

The deployment kit deliberately has two modes:

- **Container mode:** Dockerfile controls Node, Debian packages, and the runtime environment. This is the closest to a plug-and-play experience across providers that accept Docker images.
- **Buildpack/native Node mode:** uses the provider's Node runtime and start command. It is easier to deploy, but OS packages and root privileges are controlled by that provider.

There is no single deployment file that can grant Docker, root, or `apt` access on a host that does not offer those capabilities. Provider-specific presets can automate the settings each host exposes, while keeping the same application, environment variables, storage, and health endpoint.
