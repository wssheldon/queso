# syntax=docker/dockerfile:1.6
# ^ Enable latest Dockerfile syntax features

# Arguments that can be overridden
ARG RUST_VERSION=nightly-slim
ARG DEBIAN_VERSION=bookworm-slim
ARG BUN_VERSION=1.2.2
ARG APP_NAME=queso-server
ARG CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse

# Builder base with dependencies
FROM rustlang/rust:${RUST_VERSION} as builder-base
ARG APP_NAME
WORKDIR /usr/src/app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    pkg-config \
    libssl-dev \
    libpq-dev \
    ca-certificates \
    curl

# Dependency builder stage
FROM builder-base as deps-builder
ARG APP_NAME
WORKDIR /usr/src/app

# Copy only files needed for dependency building
COPY queso/Cargo.toml queso/Cargo.lock ./queso/
COPY queso/queso-server/Cargo.toml ./queso/queso-server/
COPY queso/queso-cli/Cargo.toml ./queso/queso-cli/

# Create minimal project structure
RUN mkdir -p queso/queso-server/src queso/queso-cli/src && \
    echo 'fn main() {}' > queso/queso-server/src/main.rs && \
    echo 'fn main() {}' > queso/queso-cli/src/main.rs

# Build dependencies
RUN cd queso && cargo build --release --bin "${APP_NAME}"

# Frontend builder stage
FROM oven/bun:${BUN_VERSION} as frontend-builder
WORKDIR /app/queso-ui

# Copy frontend source first to ensure all config files are available
COPY queso/queso-ui/ ./

# Install dependencies and required Vite plugins
RUN bun install && \
    bun add -d @vitejs/plugin-react @tailwindcss/vite @tanstack/router-plugin @sentry/vite-plugin && \
    NODE_ENV=production bunx vite build

# Final builder stage for Rust
FROM builder-base as rust-builder
ARG APP_NAME
WORKDIR /usr/src/app

# Copy built dependencies and source code
COPY --from=deps-builder /usr/src/app/queso/target ./queso/target
COPY --from=deps-builder /usr/local/cargo/registry /usr/local/cargo/registry
COPY queso/queso-server/src ./queso/queso-server/src
COPY queso/queso-cli/src ./queso/queso-cli/src
COPY queso/queso-server/migrations ./queso/queso-server/migrations
COPY queso/Cargo.toml queso/Cargo.lock ./queso/
COPY queso/queso-server/Cargo.toml ./queso/queso-server/
COPY queso/queso-cli/Cargo.toml ./queso/queso-cli/

# Build the application
RUN cd queso && cargo build --release --bin "${APP_NAME}" && \
    strip target/release/${APP_NAME}

# Runtime stage
FROM debian:${DEBIAN_VERSION} as runtime
ARG APP_NAME

# Create non-root user
RUN groupadd -r queso && useradd -r -g queso -s /bin/false queso

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpq5 \
    ca-certificates \
    tini \
    curl \
    git \
    postgresql-client && \
    rm -rf /var/lib/apt/lists/*

# Set up application
WORKDIR /app/queso
# Copy the entire repository structure
COPY .git ./.git
COPY queso/queso-server/migrations ./queso-server/migrations
COPY --from=rust-builder /usr/src/app/queso/target/release/${APP_NAME} /usr/local/bin/
# Copy frontend build
COPY --from=frontend-builder /app/queso-ui/dist ./dist

RUN chown -R queso:queso /app

# Set environment variables
ENV SERVER_HOST=0.0.0.0 \
    API_PORT=3000 \
    RUST_LOG=info \
    TZ=UTC \
    RUST_BACKTRACE=1 

# Set up health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${API_PORT}/health || exit 1

# Switch to non-root user
USER queso

# Expose port
EXPOSE ${API_PORT}

# Use tini as init system
ENTRYPOINT ["/usr/bin/tini", "--"]

# Run the application
CMD ["queso-server"] 