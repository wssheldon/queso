use axum::{
    Router,
    middleware::from_extractor,
    routing::{get, post},
};

use super::{handler, model::AuthUser, service::AuthService};

pub fn auth_routes() -> Router<AuthService> {
    Router::new()
        .route("/login", post(handler::login))
        .route(
            "/me",
            get(handler::me).route_layer(from_extractor::<AuthUser>()),
        )
        .route(
            "/logout",
            post(handler::logout).route_layer(from_extractor::<AuthUser>()),
        )
}
