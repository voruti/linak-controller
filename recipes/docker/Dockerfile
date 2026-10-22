FROM node:22.23.4@sha256:63538dfe497cc29dfafdda25ada09b46db68a3f4cc205abf1f5d6bf0913f3384 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY ./ ./
RUN npm run build


FROM node:22.23.4@sha256:63538dfe497cc29dfafdda25ada09b46db68a3f4cc205abf1f5d6bf0913f3384

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
