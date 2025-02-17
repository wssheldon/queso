use axum::{Json, extract::State};

use super::{
    model::{AuthError, AuthUser, LoginRequest, LoginResponse},
    oauth::OAuthState,
};

pub async fn login(
    State(state): State<OAuthState>,
    Json(payload): Json<LoginRequest>,
) -> Result<Json<LoginResponse>, AuthError> {
    let token = state
        .auth_service
        .login(payload.username, payload.password)
        .await?;
    Ok(Json(LoginResponse::new(token)))
}

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

pub async fn logout(_auth_user: AuthUser) -> Result<(), AuthError> {
    // In a real application, you might want to invalidate the token
    // by adding it to a blacklist or implementing token revocation
    Ok(())
}
