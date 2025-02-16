# Queso

A modern web application built with Rust and React.

## Prerequisites

- Docker and Docker Compose
- Rust (latest stable)
- Node.js (v18 or later)
- npm

## Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd queso
   ```

2. Initial setup:
   ```bash
   cargo install --path queso/queso-cli/
   ```
   This will:
   - Start PostgreSQL in Docker
   - Run database migrations
   - Set up the development environment

3. Start the development environment:
   ```bash
   queso dev start
   ```

4. Stop the development environment:
   ```bash
   queso dev stop
   ```

## API Endpoints

- `GET /health` - Health check
- `POST /api/users` - Create user
- `GET /api/users` - List users