FROM node:22.16.0@sha256:0b5b940c21ab03353de9042f9166c75bcfc53c4cd0508c7fd88576646adbf875 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY ./ ./
RUN npm run build


FROM node:22.16.0@sha256:0b5b940c21ab03353de9042f9166c75bcfc53c4cd0508c7fd88576646adbf875

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
