FROM node:26-bookworm-slim

ENV NODE_ENV=production

# Install a useful Debian starter toolkit and grant the unprivileged app user
# permission to run only apt-get through sudo. Runtime package changes are
# temporary; add permanent packages to this Dockerfile.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       bash \
       ca-certificates \
       curl \
       ffmpeg \
       git \
       nano \
       python3 \
       python3-pip \
       sudo \
       tree \
       unzip \
       zip \
    && rm -rf /var/lib/apt/lists/* \
    && printf 'node ALL=(root) NOPASSWD: /usr/bin/apt-get\n' > /etc/sudoers.d/node-apt \
    && chmod 0440 /etc/sudoers.d/node-apt

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN chown -R node:node /app

USER node

EXPOSE 10000
CMD ["npm", "start"]
