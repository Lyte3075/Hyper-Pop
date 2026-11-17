FROM node:26-bookworm-slim

ENV NODE_ENV=production

# Install a useful Debian starter toolkit. The server starts as root so its
# authenticated APT endpoint can manage packages despite Render's no-new-privileges
# setting. Project processes are explicitly dropped to the unprivileged node user.
# Runtime package changes are temporary; add permanent packages here.
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
       tree \
       unzip \
       zip \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .
RUN chown -R node:node /app

USER root

EXPOSE 10000
CMD ["npm", "start"]
