FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app

# Non-root user for security
RUN addgroup -S cine && adduser -S cine -G cine

COPY --from=deps /app/node_modules ./node_modules
COPY index.js ./

USER cine
EXPOSE 3000
ENV NODE_ENV=production PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -qO- http://localhost:3000/healthz || exit 1

CMD ["node", "index.js"]
