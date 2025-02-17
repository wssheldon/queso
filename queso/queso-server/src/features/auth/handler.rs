use axum::{Json, extract::State};

use super::{
    model::{AuthError, AuthUser, EmailLoginRequest, LoginResponse},
    oauth::OAuthState,
};
use crate::features::users::model::User;

/// Login with email and password
#[utoipa::path(
    post,
    path = "/api/auth/login",
    request_body = EmailLoginRequest,
    responses(
        (status = 200, description = "Successfully logged in", body = LoginResponse),
        (status = 401, description = "Invalid credentials"),
        (status = 500, description = "Internal server error")
    ),
    tag = "auth"
)]
pub async fn login(
    State(state): State<OAuthState>,
    Json(payload): Json<EmailLoginRequest>,
) -> Result<Json<LoginResponse>, AuthError> {
    let response = state.auth_service.login_with_email(payload).await?;
    Ok(Json(response))
}

/// Get current user information
#[utoipa::path(
    get,
    path = "/api/auth/me",
    responses(
        (status = 200, description = "Successfully retrieved user information", body = User),
        (status = 401, description = "Unauthorized"),
        (status = 404, description = "User not found")
    ),
    security(
        ("jwt" = [])
    ),
    tag = "auth"
)]
pub async fn me(
    State(state): State<OAuthState>,
    auth_user: AuthUser,
) -> Result<Json<serde_json::Value>, AuthError> {
    let user = state.auth_service.get_user(auth_user.user_id).await?;
    Ok(Json(serde_json::json!({
        "id": user.id,
        "username": user.username,
        "email": user.email,
    })))
}

/// Logout current user
#[utoipa::path(
    post,
    path = "/api/auth/logout",
    responses(
        (status = 200, description = "Successfully logged out"),
        (status = 401, description = "Unauthorized")
    ),
    security(
        ("jwt" = [])
    ),
    tag = "auth"
)]
pub async fn logout(State(state): State<OAuthState>, auth_user: AuthUser) -> Result<(), AuthError> {
    // Invalidate the user's session/token
    state
        .auth_service
        .invalidate_session(auth_user.user_id)
        .await?;
    Ok(())
}
