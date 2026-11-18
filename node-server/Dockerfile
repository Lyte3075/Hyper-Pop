FROM node:26-bookworm-slim

ENV NODE_ENV=production
ENV PORT=10000
ENV HP_COMMAND_HOME=/home/node

# Install the operating-system tools into the image so they survive restarts
# and are available on every host that supports Docker.
# Add permanent Debian packages to this list, then rebuild the image.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       bash \
       ca-certificates \
       cowsay \
       curl \
       ffmpeg \
       git \
       nano \
       python3 \
       python3-pip \
       tree \
       unzip \
       zip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Node dependencies during image build, not at every container start.
COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN chown -R node:node /app

# The API needs root for its authenticated APT bridge. Project code is
# launched separately as the unprivileged node user by server.js.
USER root

EXPOSE 10000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||10000)+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
