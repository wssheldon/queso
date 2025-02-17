use axum::{Router, routing::get};
use tower_http::cors::{Any, CorsLayer};

use crate::{
    config::database::establish_connection_pool,
    features::{
        auth::{
            oauth::{OAuthConfig, OAuthState},
            router::auth_routes,
            service::AuthService,
        },
        users::{repository::UserRepository, router::user_routes, service::UserService},
    },
};

pub async fn run_server() {
    // Create database pool
    let pool = establish_connection_pool();

    // Create repositories
    let user_repository = UserRepository::new(pool.clone());

    // Create services
    let user_service = UserService::new(user_repository);
    let auth_service = AuthService::new(user_service.clone());

    // Create OAuth config
    let oauth_config = OAuthConfig::new(
        std::env::var("GOOGLE_CLIENT_ID").expect("GOOGLE_CLIENT_ID must be set"),
        std::env::var("GOOGLE_CLIENT_SECRET").expect("GOOGLE_CLIENT_SECRET must be set"),
        "https://accounts.google.com/o/oauth2/v2/auth".to_string(),
        "https://oauth2.googleapis.com/token".to_string(),
        std::env::var("GOOGLE_REDIRECT_URL").expect("GOOGLE_REDIRECT_URL must be set"),
    )
    .expect("Failed to create OAuth config");

    // Create CORS layer
    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_origin(Any);

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
        .layer(cors);

    // Run it
    let listener = tokio::net::TcpListener::bind("127.0.0.1:3000")
        .await
        .unwrap();
    tracing::info!("Server listening on http://127.0.0.1:3000");

    axum::serve(listener, app).await.unwrap();
}

async fn health_check() -> axum::http::StatusCode {
    axum::http::StatusCode::OK
}
