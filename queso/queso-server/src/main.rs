use dotenvy::dotenv;
use git2::Repository;
use std::{env, path::PathBuf};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

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

    // Start the server
    queso_server::run_server().await;
}
