FROM node:20@sha256:34ebf3e5d4a51d4b1af4b78188f9b0ad0daf1d763395e2390ab935f910350b78 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY ./ ./
RUN npm run build


FROM node:20@sha256:34ebf3e5d4a51d4b1af4b78188f9b0ad0daf1d763395e2390ab935f910350b78

# install required packages:
RUN apt-get update && \
    apt-get install -y \
        bluez bluetooth libbluetooth-dev libudev-dev \
        # for healthcheck:
        jq

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit dev

COPY ./recipes/docker/ ./
RUN chmod +x *.sh

# healthcheck:
HEALTHCHECK CMD /app/healthcheck.sh

COPY --from=builder /app/dist/ ./

ENTRYPOINT ["sh", "docker_entrypoint.sh"]
