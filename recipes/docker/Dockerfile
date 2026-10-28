FROM node:22.23.4@sha256:18a6d90fd60542269850c80ca03b29b1d9b14d6b221ac7ee8e35b0d33ef904bd AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY ./ ./
RUN npm run build


FROM node:22.23.4@sha256:18a6d90fd60542269850c80ca03b29b1d9b14d6b221ac7ee8e35b0d33ef904bd

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
