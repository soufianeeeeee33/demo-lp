# Image du site Bulk Maroc (Node.js + SQLite)
FROM node:22-bookworm-slim

ENV NODE_ENV=production \
    TZ=Africa/Casablanca
WORKDIR /app

# Dépendances (better-sqlite3 utilise une version précompilée pour Linux)
COPY package.json package-lock.json* ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

# Code du site (le .env et la base ne sont PAS copiés : voir .dockerignore)
COPY . .

# Utilisateur non-root ; la base est montée dans /app/database
RUN mkdir -p /app/database && chown -R node:node /app/database
USER node

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
