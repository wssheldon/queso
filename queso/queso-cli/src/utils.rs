use anyhow::{Context, Result};
use git2::Repository;
use std::path::{Path, PathBuf};

pub fn find_git_root() -> Result<PathBuf> {
    let current_dir = std::env::current_dir().context("Failed to get current directory")?;
    let repo = Repository::discover(current_dir).context("Failed to find git repository")?;
    let repo_path = repo
        .path()
        .parent()
        .context("Failed to get repository root")?;
    Ok(repo_path.to_path_buf())
}

pub fn get_project_paths(git_root: &Path) -> ProjectPaths {
    let queso_dir = git_root.join("queso");
    ProjectPaths {
        server: queso_dir.join("queso-server"),
        ui: queso_dir.join("queso-ui"),
        docker_compose: git_root.join("docker-compose.yml"),
    }
}

#[derive(Debug, Clone)]
pub struct ProjectPaths {
    pub server: PathBuf,
    pub ui: PathBuf,
    pub docker_compose: PathBuf,
}
