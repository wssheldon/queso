use axum::{
    routing::{get, post},
    Router,
};

use super::{handler, service::UserService};

pub fn user_routes() -> Router<UserService> {
    Router::new()
        .route("/users", post(handler::create_user))
        .route("/users", get(handler::list_users))
} 