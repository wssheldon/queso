use axum::{
    Router,
    routing::{delete, get, post},
};

use super::{handler, service::UserService};

pub fn user_routes() -> Router<UserService> {
    Router::new()
        .route("/", get(handler::get_users))
        .route("/", post(handler::create_user))
        .route("/{id}", get(handler::get_user))
        .route("/{id}", delete(handler::delete_user))
}
