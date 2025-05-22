FROM oven/bun:alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN apk update && apk upgrade
RUN bun install --production
COPY . .
RUN bun run build

FROM oven/bun:alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
EXPOSE 5000
CMD ["bun", "run", "start"]
