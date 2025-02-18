use crate::{
    config::database::{establish_connection_pool, run_migrations},
    features::{
        auth::{
            oauth::{OAuthConfig, OAuthState},
            router::auth_routes,
            service::AuthService,
        },
        users::{repository::UserRepository, router::user_routes, service::UserService},
    },
    openapi::ApiDoc,
};
use axum::{Router, routing::get};
use tower_http::{
    cors::{Any, CorsLayer},
    services::{ServeDir, ServeFile},
};
use utoipa::OpenApi;
use utoipa_swagger_ui::SwaggerUi;

pub async fn run_server() {
    // Create database pool
    let pool = establish_connection_pool();

    // Run migrations
    tracing::info!("Running database migrations...");
    run_migrations(&pool);

    // Create repositories
    let user_repository = UserRepository::new(pool.clone());

    // Create services
    let user_service = UserService::new(user_repository);
    let auth_service = AuthService::new(user_service.clone());

    // Create OAuth config
    let oauth_config = OAuthConfig::new(
        std::env::var("GOOGLE_CLIENT_ID").expect("GOOGLE_CLIENT_ID must be set"),
        std::env::var("GOOGLE_CLIENT_SECRET").expect("GOOGLE_CLIENT_SECRET must be set"),
        std::env::var("GOOGLE_AUTH_URL").expect("GOOGLE_AUTH_URL must be set"),
        std::env::var("GOOGLE_TOKEN_URL").expect("GOOGLE_TOKEN_URL must be set"),
        std::env::var("GOOGLE_REDIRECT_URL").expect("GOOGLE_REDIRECT_URL must be set"),
    )
    .expect("Failed to create OAuth config");

    // Create CORS layer
    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_origin(Any);

    // Setup static file serving with SPA fallback
    let static_files_service =
        ServeDir::new("dist").not_found_service(ServeFile::new("dist/index.html"));

    // Build our application with routes
    let app = Router::new()
        .route("/health", get(health_check))
        .nest("/api/users", user_routes().with_state(user_service.clone()))
        .nest(
            "/api/auth",
            auth_routes().with_state(OAuthState {
                oauth_config: oauth_config.clone(),
                auth_service: auth_service.clone(),
                user_service,
            }),
        )
        .merge(SwaggerUi::new("/swagger-ui").url("/api-docs/openapi.json", ApiDoc::openapi()))
        .fallback_service(static_files_service)
        .layer(cors);

    // Get server host and port from environment
    let host = std::env::var("SERVER_HOST").expect("SERVER_HOST must be set");
    let port = std::env::var("API_PORT").expect("API_PORT must be set");
    let addr = format!("{}:{}", host, port);

    // Run it
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    tracing::info!("Server listening on http://{}", addr);
    tracing::info!("API documentation available at http://{}/swagger-ui", addr);

    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> axum::http::StatusCode {
    axum::http::StatusCode::OK
}
