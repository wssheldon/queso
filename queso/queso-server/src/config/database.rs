use diesel::PgConnection;
use diesel::r2d2::{self, ConnectionManager};
use diesel_migrations::{EmbeddedMigrations, MigrationHarness, embed_migrations};

pub type DbPool = r2d2::Pool<ConnectionManager<PgConnection>>;

pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("migrations");

pub fn establish_connection_pool() -> DbPool {
    let database_url = std::env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    let manager = ConnectionManager::<PgConnection>::new(database_url);
    r2d2::Pool::builder()
        .build(manager)
        .expect("Failed to create pool")
}

pub fn run_migrations(pool: &DbPool) {
    let mut conn = pool.get().expect("Failed to get DB connection");
    conn.run_pending_migrations(MIGRATIONS)
        .expect("Failed to run migrations");
    tracing::info!("Database migrations completed successfully");
}
