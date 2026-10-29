# Build configuration: Dockerfile
# Folder: Project root
# File: Dockerfile
# Purpose: Packages the frontend and C++ backend into the Linux image used
#   by Render.

# Render builds the frontend and C++ backend automatically.
FROM node:22-bookworm-slim AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/js ./js
COPY CHANGELOG.md /CHANGELOG.md
RUN npm run build

FROM debian:bookworm-slim AS backend-build
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential cmake ca-certificates libcurl4-openssl-dev libxml2-dev \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /source
COPY backend ./backend
RUN cmake -S backend -B build -DCMAKE_BUILD_TYPE=Release -DBUILD_TESTING=ON \
    && cmake --build build --parallel 2 \
    && ctest --test-dir build --output-on-failure

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libcurl4 libxml2 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=backend-build /source/build/rodtra /usr/local/bin/rodtra
COPY frontend/index.html frontend/favicon.svg ./frontend/
COPY frontend/css ./frontend/css
COPY frontend/images ./frontend/images
COPY --from=frontend-build /frontend/assets ./frontend/assets
USER 10001:10001
ENV PORT=10000
EXPOSE 10000
CMD ["rodtra"]
