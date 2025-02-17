use axum::{Router, routing::get};
use dotenvy::dotenv;
use git2::Repository;
use std::{env, path::PathBuf};
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use queso_server::{
    config::database::establish_connection_pool,
    features::{
        auth::{AuthService, auth_routes},
        users::{UserService, user_routes},
    },
};

fn find_git_root() -> PathBuf {
    let current_dir = env::current_dir().expect("Failed to get current directory");
    let repo = Repository::discover(current_dir).expect("Failed to find git repository");
    repo.path()
        .parent()
        .expect("Failed to get repository root")
        .to_path_buf()
}

#[tokio::main]
async fn main() {
    // Load .env from workspace root
    let workspace_root = find_git_root();
    env::set_current_dir(&workspace_root).expect("Failed to change to workspace root");
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
    let user_repository =
        queso_server::features::users::repository::UserRepository::new(pool.clone());
    let user_service = UserService::new(user_repository.clone());

    // Create auth service
    let auth_service = AuthService::new(user_repository);

    // Create CORS layer
    let cors = CorsLayer::new()
        .allow_methods(Any)
        .allow_headers(Any)
        .allow_origin(Any);

    // Build our application with routes
    let app = Router::new()
        .route("/health", get(health_check))
        .nest("/api/users", user_routes().with_state(user_service))
        .nest("/api/auth", auth_routes().with_state(auth_service))
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
