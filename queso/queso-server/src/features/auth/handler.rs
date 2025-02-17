use axum::{Json, extract::State};

use super::{
    model::{AuthError, AuthUser, EmailLoginRequest, LoginResponse},
    oauth::OAuthState,
};

pub async fn login(
    State(state): State<OAuthState>,
    Json(payload): Json<EmailLoginRequest>,
) -> Result<Json<LoginResponse>, AuthError> {
    let response = state.auth_service.login_with_email(payload).await?;
    Ok(Json(response))
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

pub async fn logout(State(state): State<OAuthState>, auth_user: AuthUser) -> Result<(), AuthError> {
    // Invalidate the user's session/token
    state
        .auth_service
        .invalidate_session(auth_user.user_id)
        .await?;
    Ok(())
}
