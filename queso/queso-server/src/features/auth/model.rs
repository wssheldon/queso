use async_trait::async_trait;
use axum::{
    Json, RequestPartsExt,
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
    response::{IntoResponse, Response},
};
use axum_extra::{
    TypedHeader,
    headers::{Authorization, authorization::Bearer},
};
use chrono::{Duration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Validation};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::env;
use std::future::Future;
use thiserror::Error;

use crate::features::users::model::UserError;

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("Invalid credentials")]
    InvalidCredentials(String),
    #[error("Missing credentials")]
    MissingCredentials,
    #[error("Token creation error: {0}")]
    TokenCreation(#[from] jsonwebtoken::errors::Error),
    #[error("User error: {0}")]
    UserError(#[from] UserError),
    #[error("OAuth error: {0}")]
    OAuthError(String),
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AuthError::InvalidCredentials(msg) => (StatusCode::UNAUTHORIZED, msg),
            AuthError::MissingCredentials => {
                (StatusCode::UNAUTHORIZED, "Missing credentials".to_string())
            }
            AuthError::TokenCreation(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to create token".to_string(),
            ),
            AuthError::UserError(e) => (StatusCode::BAD_REQUEST, e.to_string()),
            AuthError::OAuthError(msg) => (StatusCode::UNAUTHORIZED, msg),
        };

        let body = Json(json!({
            "error": error_message,
        }));

        (status, body).into_response()
    }
}

pub(crate) static KEYS: Lazy<Keys> = Lazy::new(|| {
    let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    Keys::new(secret.as_bytes())
});

#[derive(Clone)]
pub(crate) struct Keys {
    pub(crate) encoding: EncodingKey,
    pub(crate) decoding: DecodingKey,
}

impl Keys {
    fn new(secret: &[u8]) -> Self {
        Self {
            encoding: EncodingKey::from_secret(secret),
            decoding: DecodingKey::from_secret(secret),
        }
    }
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,
    pub exp: usize,
    pub iat: usize,
    pub nbf: usize,
    pub user_id: i32,
}

impl Claims {
    pub fn new(user_id: i32) -> Self {
        let now = Utc::now().timestamp() as usize;
        let exp = (Utc::now() + Duration::hours(24)).timestamp() as usize;

        Self {
            sub: user_id.to_string(),
            exp,
            iat: now,
            nbf: now,
            user_id,
        }
    }
}

#[derive(Debug)]
pub struct AuthUser {
    pub user_id: i32,
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AuthError;

    #[allow(clippy::manual_async_fn)]
    fn from_request_parts(
        parts: &mut Parts,
        _state: &S,
    ) -> impl Future<Output = Result<Self, Self::Rejection>> + Send {
        async move {
            let TypedHeader(Authorization(bearer)) = parts
                .extract::<TypedHeader<Authorization<Bearer>>>()
                .await
                .map_err(|_| AuthError::MissingCredentials)?;

            let token_data = jsonwebtoken::decode::<Claims>(
                bearer.token(),
                &KEYS.decoding,
                &Validation::default(),
            )
            .map_err(AuthError::TokenCreation)?;

            Ok(AuthUser {
                user_id: token_data.claims.user_id,
            })
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct UsernameLoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Deserialize, Serialize)]
pub struct EmailLoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    pub token: String,
    pub token_type: String,
}

impl LoginResponse {
    pub fn new(token: String) -> Self {
        Self {
            token,
            token_type: "Bearer".to_string(),
        }
    }
}
