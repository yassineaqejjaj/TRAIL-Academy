# Railway service "video-worker": set the service root directory to services/video-worker. No public port: it polls the database.
FROM node:24-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY src ./src
USER node
CMD ["node", "src/worker.ts"]
