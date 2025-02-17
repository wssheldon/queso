# Queso

A modern web application for [your application description].

## Features

- User authentication with Google OAuth
- RESTful API with OpenAPI documentation
- Modern React frontend with Tailwind CSS
- PostgreSQL database with Diesel ORM

## Getting Started

### Prerequisites

- Rust (latest stable)
- Node.js (v20 or later)
- PostgreSQL
- Docker and Docker Compose

### Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/queso.git
   cd queso
   ```

2. Copy the example environment file:

   ```bash
   cp .env.example .env
   ```

3. Update the environment variables in `.env` with your configuration.

4. Start the development environment:
   ```bash
   cargo run --bin queso-cli -- dev start
   ```

This will start:

- PostgreSQL database
- Backend API server
- Frontend development server

### API Documentation

The API documentation is available through Swagger UI when the server is running:

```
http://localhost:3000/swagger-ui
```

The OpenAPI specification is automatically generated from the code and includes:

- All available endpoints
- Request/response schemas
- Authentication requirements
- Example requests

You can also get the raw OpenAPI specification at:

```
http://localhost:3000/api-docs/openapi.json
```

### Testing

Run the test suite:

```bash
cargo test
```

### Building for Production

Build the project:

```bash
cargo build --release
```

## Deployment

See the [deployment documentation](distribution/README.md) for instructions on deploying to AWS ECS.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

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
