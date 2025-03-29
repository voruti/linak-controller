FROM node:20@sha256:735b1ba7e4550c415f98568efbf527e3f75828ac4f10692e490ca78e11d89f6e AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY ./ ./
RUN npm run build


FROM node:20@sha256:735b1ba7e4550c415f98568efbf527e3f75828ac4f10692e490ca78e11d89f6e

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
