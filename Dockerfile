# Render builds the frontend and C++ backend automatically.
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/js ./js
RUN npm run build

FROM debian:bookworm-slim AS backend-build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake ca-certificates libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /source
COPY backend ./backend
RUN cmake -S backend -B build -DCMAKE_BUILD_TYPE=Release \
    && cmake --build build --parallel 2

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libcurl4 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend-build /source/build/rodtra /usr/local/bin/rodtra
COPY frontend/index.html frontend/favicon.svg ./frontend/
COPY frontend/css ./frontend/css
COPY --from=frontend-build /frontend/assets ./frontend/assets
USER 10001:10001
ENV PORT=10000
EXPOSE 10000
CMD ["rodtra"]
