use axum::{Router, routing::get};
use dotenvy::dotenv;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use queso_server::{
    config::database::establish_connection_pool,
    features::users::{UserService, user_routes},
};

#[tokio::main]
async fn main() {
    dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::new(
            std::env::var("RUST_LOG").unwrap_or_else(|_| "info".into()),
        ))
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Set up database connection pool
    let pool = establish_connection_pool();

    // Create user service
    let user_repository = queso_server::features::users::repository::UserRepository::new(pool);
    let user_service = UserService::new(user_repository);

    // Create CORS layer
    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_origin(Any);

    // Build our application with routes
    let app = Router::new()
        .route("/health", get(health_check))
        .nest("/api", user_routes())
        .layer(cors)
        .with_state(user_service);

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
