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

2. Set up environment configuration:

   ```bash
   cp .env.example .env
   ```

   Edit the `.env` file and update the values as needed. The configuration is shared between the server and UI components.

3. Initial setup:

   ```bash
   cargo install --path queso/queso-cli/
   ```

   This will:

   - Start PostgreSQL in Docker
   - Run database migrations
   - Set up the development environment

4. Start the development environment:

   ```bash
   queso dev start
   ```

5. Stop the development environment:
   ```bash
   queso dev stop
   ```

## API Endpoints

- `GET /health` - Health check
- `POST /api/users` - Create user
- `GET /api/users` - List users

## TODO

- [ ] Add frontend login check / authorized routes
- [ ] Add logout funcitonality
- [ ] Add password reset functionality
- [ ] Add user management functionality
- [ ] Add role-based access control
- [ ] Add pulumi deployment instructions
- [ ] Add monitoring and observability
- [ ] Add sign-in with google
