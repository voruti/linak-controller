FROM node:22.20.0@sha256:2bb201f33898d2c0ce638505b426f4dd038cc00e5b2b4cbba17b069f0fff1496 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY ./ ./
RUN npm run build


FROM node:22.20.0-slim@sha256:d943bf20249f8b92eff6f605362df2ee9cf2d6ce2ea771a8886e126ec8714f08

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
