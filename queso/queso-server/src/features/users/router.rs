use axum::{
    Router,
    routing::{get, post},
};

use super::{handler, service::UserService};

pub fn user_routes() -> Router<UserService> {
    Router::new()
        .route("/", post(handler::create_user))
        .route("/", get(handler::list_users))
}
