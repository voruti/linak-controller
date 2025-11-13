FROM node:24.11.1@sha256:7f80506b8225bcce2ce8202b1026fcde8f0bfb716b1b833f20250d79d4463276 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY ./ ./
RUN npm run build


FROM node:24.11.1@sha256:7f80506b8225bcce2ce8202b1026fcde8f0bfb716b1b833f20250d79d4463276

# install required packages:
RUN apt-get update && \
    apt-get install -y \
        bluetooth bluez libbluetooth-dev libudev-dev \
        # for healthcheck:
        jq \
    && apt-get clean

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit dev

COPY ./recipes/docker/ ./
RUN chmod +x ./*.sh

# healthcheck:
HEALTHCHECK CMD ["/app/healthcheck.sh"]

COPY --from=builder /app/dist/ ./

ENTRYPOINT ["sh", "docker_entrypoint.sh"]
