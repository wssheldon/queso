# Builder stage
FROM rustlang/rust:nightly-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /usr/src/app

# First copy workspace files and Cargo.toml files
COPY queso/Cargo.toml queso/Cargo.lock ./queso/
COPY queso/queso-server/Cargo.toml ./queso/queso-server/
COPY queso/queso-cli/Cargo.toml ./queso/queso-cli/

# Create dummy source files for all workspace members
RUN mkdir -p queso/queso-server/src && \
    echo "fn main() {}" > queso/queso-server/src/main.rs && \
    mkdir -p queso/queso-cli/src && \
    echo "fn main() {}" > queso/queso-cli/src/main.rs

# Build dependencies only (this layer will be cached if dependencies don't change)
RUN cd queso && cargo build --release --bin queso-server

# Now copy the actual source code
COPY queso/queso-server/src ./queso/queso-server/src
COPY queso/queso-cli/src ./queso/queso-cli/src
COPY queso/queso-server/migrations ./queso/queso-server/migrations

# Build the application
RUN cd queso && cargo build --release --bin queso-server

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m -U -s /bin/false queso

# Copy the binary from builder
COPY --from=builder /usr/src/app/queso/target/release/queso-server /usr/local/bin/
COPY --from=builder /usr/src/app/queso/queso-server/migrations /usr/local/share/queso/migrations

# Set environment variables
ENV SERVER_HOST=0.0.0.0
ENV API_PORT=3000

# Use the non-root user
USER queso

# Expose the port
EXPOSE 3000

# Run the binary
CMD ["queso-server"] 