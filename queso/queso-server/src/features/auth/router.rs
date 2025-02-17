use axum::{
    Router,
    middleware::from_extractor,
    routing::{get, post},
};

use super::{
    handler,
    model::AuthUser,
    oauth::{self, OAuthState},
    service::AuthService,
};

pub fn auth_routes() -> Router<OAuthState> {
    Router::new()
        .route("/login", post(handler::login))
        .route("/google/login", get(oauth::google_login))
        .route("/google/callback", get(oauth::google_callback))
        .route(
            "/me",
            get(handler::me).route_layer(from_extractor::<AuthUser>()),
        )
        .route(
            "/logout",
            post(handler::logout).route_layer(from_extractor::<AuthUser>()),
        )
}
