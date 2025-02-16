mod commands;
mod utils;

use anyhow::Result;
use clap::{Parser, Subcommand};
use commands::DevCommand;
use utils::{find_git_root, get_project_paths};

#[derive(Debug, Parser)]
#[command(name = "queso")]
#[command(about = "Queso development CLI", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// Manage development environment
    Dev(DevCommand),
}

#[tokio::main]
async fn main() -> Result<()> {
    // Initialize logging
    tracing_subscriber::fmt::init();

    // Parse command line arguments
    let cli = Cli::parse();

    // Find git root and get project paths
    let git_root = find_git_root()?;
    let paths = get_project_paths(&git_root);

    // Execute command
    match cli.command {
        Commands::Dev(cmd) => cmd.run(paths).await,
    }
}