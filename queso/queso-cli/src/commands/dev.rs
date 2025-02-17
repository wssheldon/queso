use crate::utils::ProjectPaths;
use anyhow::{Context, Result};
use clap::{Args, Subcommand};
use console::{Emoji, style};
use indicatif::{ProgressBar, ProgressStyle};
use std::{path::PathBuf, process::Command, time::Duration};
use tokio::signal;

// Static emojis
static TRUCK: Emoji<'_, '_> = Emoji("🚛 ", "");
static ROCKET: Emoji<'_, '_> = Emoji("🚀 ", "");
static PACKAGE: Emoji<'_, '_> = Emoji("📦 ", "");
static DATABASE: Emoji<'_, '_> = Emoji("🗄️  ", "");
static SPARKLE: Emoji<'_, '_> = Emoji("✨ ", "");

// Configuration for environment setup
#[derive(Debug, Clone)]
pub struct EnvConfig {
    pub postgres_wait_time: Duration,
    pub postgres_wait_interval: Duration,
}

impl Default for EnvConfig {
    fn default() -> Self {
        Self {
            postgres_wait_time: Duration::from_secs(5),
            postgres_wait_interval: Duration::from_secs(1),
        }
    }
}

// Command executor trait for better testability
#[cfg_attr(test, mockall::automock)]
pub trait CommandExecutor: Send + Sync {
    fn execute(&self, command: String, args: Vec<String>, cwd: Option<PathBuf>) -> Result<()>;
    fn spawn(&self, command: String, args: Vec<String>, cwd: Option<PathBuf>) -> Result<()>;
}

// Real command executor implementation
#[derive(Default)]
pub struct RealCommandExecutor;

impl CommandExecutor for RealCommandExecutor {
    fn execute(&self, command: String, args: Vec<String>, cwd: Option<PathBuf>) -> Result<()> {
        let mut cmd = Command::new(command);
        cmd.args(args);
        if let Some(cwd) = cwd {
            cmd.current_dir(cwd);
        }
        cmd.status()
            .with_context(|| "Failed to execute command".to_string())?;
        Ok(())
    }

    fn spawn(&self, command: String, args: Vec<String>, cwd: Option<PathBuf>) -> Result<()> {
        let mut cmd = Command::new(command);
        cmd.args(args);
        if let Some(cwd) = cwd {
            cmd.current_dir(cwd);
        }
        cmd.spawn()
            .with_context(|| "Failed to spawn command".to_string())?;
        Ok(())
    }
}

// Progress display helper
pub struct ProgressDisplay {
    spinner: ProgressBar,
}

impl ProgressDisplay {
    pub fn new(style: &str) -> Result<Self> {
        let spinner = ProgressBar::new_spinner();
        spinner.set_style(
            ProgressStyle::default_spinner()
                .tick_chars("⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏")
                .template(style)?,
        );
        Ok(Self { spinner })
    }

    pub fn message(&self, msg: &str) {
        self.spinner.set_message(msg.to_string());
    }

    pub fn finish(&self, msg: &str) {
        self.spinner.finish_with_message(msg.to_string());
    }
}

// Add after the static emojis
const BACKEND_PORT: u16 = 3000;
const FRONTEND_PORT: u16 = 5173;
const POSTGRES_PORT: u16 = 5432;

#[derive(Debug)]
pub struct ServiceInfo {
    name: String,
    url: String,
    #[allow(dead_code)]
    port: u16,
}

impl ServiceInfo {
    fn new(name: &str, url: &str, port: u16) -> Self {
        Self {
            name: name.to_string(),
            url: url.to_string(),
            port,
        }
    }
}

// Environment manager for handling environment operations
pub struct EnvironmentManager<T: CommandExecutor> {
    paths: ProjectPaths,
    executor: T,
    config: EnvConfig,
}

impl<T: CommandExecutor> EnvironmentManager<T> {
    pub fn new(paths: ProjectPaths, executor: T, config: EnvConfig) -> Self {
        Self {
            paths,
            executor,
            config,
        }
    }

    pub fn start_docker(&self, progress: &ProgressDisplay) -> Result<()> {
        progress.message("Starting Docker services...");
        self.executor.execute(
            "docker-compose".to_string(),
            vec![
                "-f".to_string(),
                self.paths.docker_compose.to_string_lossy().to_string(),
                "up".to_string(),
                "-d".to_string(),
            ],
            None,
        )?;
        progress.finish(&format!("{} Docker services started", style("✓").green()));
        Ok(())
    }

    pub fn stop_docker(&self, progress: &ProgressDisplay) -> Result<()> {
        progress.message("Stopping Docker services...");
        self.executor.execute(
            "docker-compose".to_string(),
            vec![
                "-f".to_string(),
                self.paths.docker_compose.to_string_lossy().to_string(),
                "down".to_string(),
            ],
            None,
        )?;
        progress.finish(&format!("{} Docker services stopped", style("✓").green()));
        Ok(())
    }

    pub fn wait_for_postgres(&self) -> Result<()> {
        let pb = ProgressBar::new(5);
        pb.set_style(
            ProgressStyle::default_bar()
                .template("{spinner:.green} {msg} {wide_bar:.cyan/blue} {pos}/{len}")?,
        );
        pb.set_message("Waiting for PostgreSQL...");

        // Ensure we don't divide by zero and have at least one interval
        let interval_ms = self.config.postgres_wait_interval.as_millis().max(1) as u64;
        let total_ms = self.config.postgres_wait_time.as_millis() as u64;
        let intervals = (total_ms / interval_ms).max(1);

        for _ in 0..intervals {
            pb.inc(1);
            std::thread::sleep(Duration::from_millis(interval_ms));
        }
        pb.finish_and_clear();
        Ok(())
    }

    fn check_port_available(&self, port: u16) -> bool {
        use std::net::TcpListener;
        TcpListener::bind(("127.0.0.1", port)).is_ok()
    }

    fn get_process_on_port(&self, port: u16) -> Option<String> {
        if cfg!(unix) {
            use std::process::Command;
            let output = Command::new("lsof")
                .args(["-i", &format!(":{}", port)])
                .output()
                .ok()?;

            let output = String::from_utf8_lossy(&output.stdout);
            let lines: Vec<&str> = output.lines().collect();
            if lines.len() > 1 {
                let process_info = lines[1].split_whitespace().collect::<Vec<&str>>();
                if process_info.len() > 1 {
                    return Some(process_info[1].to_string());
                }
            }
        }
        None
    }

    fn kill_process(&self, process_id: &str) -> Result<()> {
        if cfg!(unix) {
            self.executor
                .execute("kill".to_string(), vec![process_id.to_string()], None)?;
        }
        Ok(())
    }

    pub fn start_backend(&self) -> Result<ServiceInfo> {
        println!(
            "\n{} {}",
            PACKAGE,
            style("Starting backend server...").cyan()
        );

        if !self.check_port_available(BACKEND_PORT) {
            if let Some(pid) = self.get_process_on_port(BACKEND_PORT) {
                println!(
                    "{} Port {} is in use by process {}. Kill it? [y/N]",
                    style("!").yellow(),
                    BACKEND_PORT,
                    pid
                );
                let mut input = String::new();
                std::io::stdin().read_line(&mut input)?;
                if input.trim().to_lowercase() == "y" {
                    self.kill_process(&pid)?;
                } else {
                    anyhow::bail!("Port {} is already in use", BACKEND_PORT);
                }
            }
        }

        self.executor.spawn(
            "cargo".to_string(),
            vec!["run".to_string()],
            Some(self.paths.server.clone()),
        )?;

        Ok(ServiceInfo::new(
            "Backend API",
            &format!("http://localhost:{}", BACKEND_PORT),
            BACKEND_PORT,
        ))
    }

    pub fn start_frontend(&self) -> Result<ServiceInfo> {
        println!("\n{} {}", SPARKLE, style("Setting up frontend...").cyan());

        if !self.check_port_available(FRONTEND_PORT) {
            if let Some(pid) = self.get_process_on_port(FRONTEND_PORT) {
                println!(
                    "{} Port {} is in use by process {}. Kill it? [y/N]",
                    style("!").yellow(),
                    FRONTEND_PORT,
                    pid
                );
                let mut input = String::new();
                std::io::stdin().read_line(&mut input)?;
                if input.trim().to_lowercase() == "y" {
                    self.kill_process(&pid)?;
                } else {
                    anyhow::bail!("Port {} is already in use", FRONTEND_PORT);
                }
            }
        }

        self.executor.execute(
            "bun".to_string(),
            vec!["install".to_string()],
            Some(self.paths.ui.clone()),
        )?;
        self.executor.spawn(
            "bun".to_string(),
            vec!["run".to_string(), "dev".to_string()],
            Some(self.paths.ui.clone()),
        )?;

        Ok(ServiceInfo::new(
            "Frontend",
            &format!("http://localhost:{}", FRONTEND_PORT),
            FRONTEND_PORT,
        ))
    }

    pub fn verify_paths(&self, progress: &ProgressDisplay) -> Result<()> {
        progress.message("Checking project structure...");

        if !self.paths.docker_compose.exists() {
            progress.finish(&format!(
                "{} Project structure check failed",
                style("✗").red()
            ));
            anyhow::bail!(
                "docker-compose.yml not found at: {}",
                self.paths.docker_compose.display()
            );
        }
        if !self.paths.server.exists() {
            progress.finish(&format!(
                "{} Project structure check failed",
                style("✗").red()
            ));
            anyhow::bail!(
                "Server directory not found at: {}",
                self.paths.server.display()
            );
        }
        if !self.paths.ui.exists() {
            progress.finish(&format!(
                "{} Project structure check failed",
                style("✗").red()
            ));
            anyhow::bail!("UI directory not found at: {}", self.paths.ui.display());
        }

        progress.finish(&format!(
            "{} Project structure verified",
            style("✓").green()
        ));
        Ok(())
    }

    pub fn setup_database(&self, progress: &ProgressDisplay) -> Result<()> {
        println!("\n{} {}", DATABASE, style("Setting up database...").cyan());

        progress.message("Installing diesel CLI...");
        self.executor.execute(
            "cargo".to_string(),
            vec![
                "install".to_string(),
                "diesel_cli".to_string(),
                "--no-default-features".to_string(),
                "--features".to_string(),
                "postgres".to_string(),
            ],
            Some(self.paths.server.clone()),
        )?;
        progress.finish(&format!("{} Diesel CLI installed", style("✓").green()));

        progress.message("Running database migrations...");
        self.executor.execute(
            "diesel".to_string(),
            vec!["migration".to_string(), "run".to_string()],
            Some(self.paths.server.clone()),
        )?;
        progress.finish(&format!(
            "{} Database migrations complete",
            style("✓").green()
        ));
        Ok(())
    }

    fn display_service_info(&self, services: &[ServiceInfo]) {
        println!("\n{} Available Services:", style("🌐").cyan());
        for service in services {
            println!(
                "  {} {} - {}",
                style("•").cyan(),
                style(&service.name).bold(),
                style(&service.url).underlined()
            );
        }
        println!();
    }

    pub async fn handle_shutdown(&self) -> Result<()> {
        println!(
            "\n{} {}",
            style("!").yellow(),
            style("Received shutdown signal. Stopping services...").yellow()
        );

        let progress = ProgressDisplay::new("{spinner:.yellow} {msg}")?;

        // Stop Docker services
        self.stop_docker(&progress)?;

        // Kill backend and frontend processes
        #[cfg(unix)]
        {
            progress.message("Stopping backend server...");
            Command::new("pkill")
                .arg("-f")
                .arg("cargo run")
                .status()
                .context("Failed to stop backend server")?;
            progress.finish(&format!("{} Backend server stopped", style("✓").green()));

            progress.message("Stopping frontend server...");
            Command::new("pkill")
                .arg("-f")
                .arg("bun run dev")
                .status()
                .context("Failed to stop frontend server")?;
            progress.finish(&format!("{} Frontend server stopped", style("✓").green()));
        }

        println!(
            "\n{} {}",
            style("✓").green(),
            style("All services stopped gracefully").green()
        );
        Ok(())
    }

    pub async fn wait_for_shutdown(&self) -> Result<()> {
        if cfg!(unix) {
            loop {
                signal::ctrl_c().await?;

                println!(
                    "\n{} {}",
                    style("?").yellow(),
                    style("Are you sure you want to stop all services? [y/N]").yellow()
                );

                let mut input = String::new();
                std::io::stdin().read_line(&mut input)?;

                if input.trim().to_lowercase() == "y" {
                    self.handle_shutdown().await?;
                    break;
                } else {
                    println!(
                        "{} {}",
                        style("i").blue(),
                        style("Continuing to run services...").blue()
                    );
                    continue;
                }
            }
        }
        Ok(())
    }
}

#[derive(Debug, Args)]
pub struct DevCommand {
    #[command(subcommand)]
    command: DevSubcommand,
}

#[derive(Debug, Subcommand)]
enum DevSubcommand {
    /// Start the development environment
    Start,
    /// Stop the development environment
    Stop,
    /// Setup the development environment
    Setup,
    /// Clean the development environment
    Clean,
}

impl DevCommand {
    pub async fn run(&self, paths: ProjectPaths) -> Result<()> {
        let executor = RealCommandExecutor;
        let config = EnvConfig::default();
        let env_manager = EnvironmentManager::new(paths, executor, config);

        match &self.command {
            DevSubcommand::Start => self.start(&env_manager).await,
            DevSubcommand::Stop => self.stop(&env_manager).await,
            DevSubcommand::Setup => self.setup(&env_manager).await,
            DevSubcommand::Clean => self.clean(&env_manager).await,
        }
    }

    async fn start<T: CommandExecutor>(&self, env_manager: &EnvironmentManager<T>) -> Result<()> {
        println!(
            "\n{} {}",
            ROCKET,
            style("Starting development environment...").cyan().bold()
        );

        let progress = ProgressDisplay::new("{spinner:.blue} {msg}")?;

        env_manager.start_docker(&progress)?;
        env_manager.wait_for_postgres()?;

        let mut services = Vec::new();

        // Start backend and frontend
        services.push(env_manager.start_backend()?);
        services.push(env_manager.start_frontend()?);
        services.push(ServiceInfo::new(
            "PostgreSQL",
            &format!("postgresql://postgres:postgres@localhost:{}", POSTGRES_PORT),
            POSTGRES_PORT,
        ));

        println!(
            "\n{} {}",
            style("✓").green(),
            style("Development environment is ready!").green().bold()
        );

        env_manager.display_service_info(&services);
        println!(
            "{} {}",
            style("i").blue(),
            style("Press Ctrl+C to stop all services").blue()
        );

        // Wait for shutdown signal
        env_manager.wait_for_shutdown().await?;
        Ok(())
    }

    async fn stop<T: CommandExecutor>(&self, env_manager: &EnvironmentManager<T>) -> Result<()> {
        println!(
            "\n{} {}",
            TRUCK,
            style("Stopping development environment...").yellow().bold()
        );

        let progress = ProgressDisplay::new("{spinner:.yellow} {msg}")?;

        env_manager.stop_docker(&progress)?;

        // Kill backend and frontend processes
        #[cfg(unix)]
        {
            progress.message("Stopping backend server...");
            Command::new("pkill")
                .arg("-f")
                .arg("cargo run")
                .status()
                .context("Failed to stop backend server")?;
            progress.finish(&format!("{} Backend server stopped", style("✓").green()));

            progress.message("Stopping frontend server...");
            Command::new("pkill")
                .arg("-f")
                .arg("bun run dev")
                .status()
                .context("Failed to stop frontend server")?;
            progress.finish(&format!("{} Frontend server stopped", style("✓").green()));
        }

        println!(
            "\n{} {}\n",
            style("✓").green(),
            style("Development environment stopped").green().bold()
        );
        Ok(())
    }

    async fn setup<T: CommandExecutor>(&self, env_manager: &EnvironmentManager<T>) -> Result<()> {
        println!(
            "\n{} {}",
            SPARKLE,
            style("Setting up development environment...").cyan().bold()
        );

        let progress = ProgressDisplay::new("{spinner:.blue} {msg}")?;

        env_manager.verify_paths(&progress)?;
        env_manager.start_docker(&progress)?;
        env_manager.wait_for_postgres()?;
        env_manager.setup_database(&progress)?;

        println!(
            "\n{} {}\n",
            style("✓").green(),
            style("Setup complete!").green().bold()
        );
        Ok(())
    }

    async fn clean<T: CommandExecutor>(&self, env_manager: &EnvironmentManager<T>) -> Result<()> {
        println!(
            "\n{} {}",
            TRUCK,
            style("Cleaning development environment...").yellow().bold()
        );

        let progress = ProgressDisplay::new("{spinner:.yellow} {msg}")?;

        // Stop and remove Docker services with volumes
        progress.message("Removing Docker services and volumes...");
        env_manager.executor.execute(
            "docker-compose".to_string(),
            vec![
                "-f".to_string(),
                env_manager
                    .paths
                    .docker_compose
                    .to_string_lossy()
                    .to_string(),
                "down".to_string(),
                "-v".to_string(),
            ],
            None,
        )?;
        progress.finish(&format!("{} Docker cleanup complete", style("✓").green()));

        println!(
            "\n{} {}\n",
            style("✓").green(),
            style("Environment cleaned successfully").green().bold()
        );
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn setup_test_env() -> (MockCommandExecutor, ProjectPaths, EnvConfig) {
        let executor = MockCommandExecutor::new();

        // Create test paths that exist
        let test_dir = std::env::temp_dir().join("queso_test");
        std::fs::create_dir_all(&test_dir).unwrap();

        let server_dir = test_dir.join("queso-server");
        let ui_dir = test_dir.join("queso-ui");
        let docker_compose = test_dir.join("docker-compose.yml");

        std::fs::create_dir_all(&server_dir).unwrap();
        std::fs::create_dir_all(&ui_dir).unwrap();
        std::fs::write(&docker_compose, "").unwrap();

        let paths = ProjectPaths {
            server: server_dir,
            ui: ui_dir,
            docker_compose,
        };

        let config = EnvConfig {
            postgres_wait_time: Duration::from_millis(100),
            postgres_wait_interval: Duration::from_millis(20),
        };

        (executor, paths, config)
    }

    impl Drop for ProjectPaths {
        fn drop(&mut self) {
            if let Some(parent) = self.server.parent() {
                let _ = std::fs::remove_dir_all(parent);
            }
        }
    }

    #[tokio::test]
    async fn test_start_command_success() {
        let (mut executor, paths, config) = setup_test_env();

        // Clone paths for closures
        let paths_clone1 = paths.clone();
        let paths_clone2 = paths.clone();
        let paths_clone3 = paths.clone();
        let paths_clone4 = paths.clone();

        // Setup expectations for port checks
        executor
            .expect_execute()
            .withf(
                move |cmd: &String, args: &Vec<String>, cwd: &Option<PathBuf>| {
                    cmd == "docker-compose"
                        && args
                            == &vec![
                                "-f".to_string(),
                                paths_clone1.docker_compose.to_string_lossy().to_string(),
                                "up".to_string(),
                                "-d".to_string(),
                            ]
                        && cwd.is_none()
                },
            )
            .times(1)
            .returning(|_, _, _| Ok(()));

        executor
            .expect_spawn()
            .withf(
                move |cmd: &String, args: &Vec<String>, cwd: &Option<PathBuf>| {
                    cmd == "cargo"
                        && args == &vec!["run".to_string()]
                        && cwd.as_ref().map(|p| p.to_str()) == Some(paths_clone2.server.to_str())
                },
            )
            .times(1)
            .returning(|_, _, _| Ok(()));

        executor
            .expect_execute()
            .withf(
                move |cmd: &String, args: &Vec<String>, cwd: &Option<PathBuf>| {
                    cmd == "bun"
                        && args == &vec!["install".to_string()]
                        && cwd.as_ref().map(|p| p.to_str()) == Some(paths_clone3.ui.to_str())
                },
            )
            .times(1)
            .returning(|_, _, _| Ok(()));

        executor
            .expect_spawn()
            .withf(
                move |cmd: &String, args: &Vec<String>, cwd: &Option<PathBuf>| {
                    cmd == "bun"
                        && args == &vec!["run".to_string(), "dev".to_string()]
                        && cwd.as_ref().map(|p| p.to_str()) == Some(paths_clone4.ui.to_str())
                },
            )
            .times(1)
            .returning(|_, _, _| Ok(()));

        let env_manager = EnvironmentManager::new(paths, executor, config);
        let cmd = DevCommand {
            command: DevSubcommand::Start,
        };

        assert!(cmd.start(&env_manager).await.is_ok());
    }

    #[tokio::test]
    async fn test_setup_command_success() {
        let (mut executor, paths, config) = setup_test_env();

        // Clone paths for closures
        let paths_clone1 = paths.clone();
        let paths_clone2 = paths.clone();
        let paths_clone3 = paths.clone();

        // Setup expectations
        executor
            .expect_execute()
            .withf(
                move |cmd: &String, args: &Vec<String>, cwd: &Option<PathBuf>| {
                    cmd == "docker-compose"
                        && args
                            == &vec![
                                "-f".to_string(),
                                paths_clone1.docker_compose.to_string_lossy().to_string(),
                                "up".to_string(),
                                "-d".to_string(),
                            ]
                        && cwd.is_none()
                },
            )
            .times(1)
            .returning(|_, _, _| Ok(()));

        executor
            .expect_execute()
            .withf(
                move |cmd: &String, args: &Vec<String>, cwd: &Option<PathBuf>| {
                    cmd == "cargo"
                        && args
                            == &vec![
                                "install".to_string(),
                                "diesel_cli".to_string(),
                                "--no-default-features".to_string(),
                                "--features".to_string(),
                                "postgres".to_string(),
                            ]
                        && cwd.as_ref().map(|p| p.to_str()) == Some(paths_clone2.server.to_str())
                },
            )
            .times(1)
            .returning(|_, _, _| Ok(()));

        executor
            .expect_execute()
            .withf(
                move |cmd: &String, args: &Vec<String>, cwd: &Option<PathBuf>| {
                    cmd == "diesel"
                        && args == &vec!["migration".to_string(), "run".to_string()]
                        && cwd.as_ref().map(|p| p.to_str()) == Some(paths_clone3.server.to_str())
                },
            )
            .times(1)
            .returning(|_, _, _| Ok(()));

        let env_manager = EnvironmentManager::new(paths, executor, config);
        let cmd = DevCommand {
            command: DevSubcommand::Setup,
        };

        assert!(cmd.setup(&env_manager).await.is_ok());
    }

    #[tokio::test]
    async fn test_stop_command_success() {
        let (mut executor, paths, config) = setup_test_env();

        // Clone paths for closure
        let paths_clone = paths.clone();

        // Setup expectations
        executor
            .expect_execute()
            .withf(
                move |cmd: &String, args: &Vec<String>, cwd: &Option<PathBuf>| {
                    cmd == "docker-compose"
                        && args
                            == &vec![
                                "-f".to_string(),
                                paths_clone.docker_compose.to_string_lossy().to_string(),
                                "down".to_string(),
                            ]
                        && cwd.is_none()
                },
            )
            .times(1)
            .returning(|_, _, _| Ok(()));

        let env_manager = EnvironmentManager::new(paths, executor, config);
        let cmd = DevCommand {
            command: DevSubcommand::Stop,
        };

        assert!(cmd.stop(&env_manager).await.is_ok());
    }

    #[tokio::test]
    async fn test_clean_command_success() {
        let (mut executor, paths, config) = setup_test_env();

        // Clone paths for closure
        let paths_clone = paths.clone();

        // Setup expectations
        executor
            .expect_execute()
            .withf(
                move |cmd: &String, args: &Vec<String>, cwd: &Option<PathBuf>| {
                    cmd == "docker-compose"
                        && args
                            == &vec![
                                "-f".to_string(),
                                paths_clone.docker_compose.to_string_lossy().to_string(),
                                "down".to_string(),
                                "-v".to_string(),
                            ]
                        && cwd.is_none()
                },
            )
            .times(1)
            .returning(|_, _, _| Ok(()));

        let env_manager = EnvironmentManager::new(paths, executor, config);
        let cmd = DevCommand {
            command: DevSubcommand::Clean,
        };

        assert!(cmd.clean(&env_manager).await.is_ok());
    }
}
