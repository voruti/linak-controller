FROM node:20 AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY ./ ./
RUN npm run build


FROM node:20

# install required packages:
RUN apt-get update && \
    apt-get install -y bluez bluetooth

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit dev

COPY --from=builder /app/dist/ ./

ENTRYPOINT ["sh", "recipes/docker/docker_entrypoint.sh"]
