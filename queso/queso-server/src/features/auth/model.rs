use async_trait::async_trait;
use axum::{
    RequestPartsExt,
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
    response::{IntoResponse, Response},
};
use axum_extra::{
    TypedHeader,
    headers::{Authorization, authorization::Bearer},
};
use chrono::{Duration, Utc};
use jsonwebtoken::{DecodingKey, EncodingKey, Validation, errors::Error as JwtError};
use once_cell::sync::Lazy;
use serde::{Deserialize, Serialize};
use std::env;
use std::future::Future;
use thiserror::Error;

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
    pub sub: i32,
    pub exp: i64,
    pub iat: i64,
    pub nbf: i64,
}

impl Claims {
    pub fn new(user_id: i32) -> Self {
        let now = Utc::now();
        Self {
            sub: user_id,
            iat: now.timestamp(),
            nbf: now.timestamp(),
            exp: (now + Duration::hours(24)).timestamp(),
        }
    }
}

#[derive(Debug)]
pub struct AuthUser {
    pub user_id: i32,
}

#[derive(Debug, Error)]
pub enum AuthError {
    #[error("Invalid token")]
    InvalidToken,
    #[error("Token expired")]
    TokenExpired,
    #[error("Wrong credentials")]
    WrongCredentials,
    #[error("Missing authorization header")]
    MissingCredentials,
    #[error("Invalid authorization header")]
    InvalidAuthHeader,
    #[error("Database error")]
    DatabaseError(#[from] diesel::result::Error),
    #[error("JWT error: {0}")]
    JwtError(#[from] JwtError),
    #[error("Password hash error: {0}")]
    PasswordHashError(#[from] argon2::password_hash::Error),
}

impl IntoResponse for AuthError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            AuthError::WrongCredentials | AuthError::InvalidToken | AuthError::TokenExpired => {
                (StatusCode::UNAUTHORIZED, "Invalid credentials")
            }
            AuthError::MissingCredentials | AuthError::InvalidAuthHeader => (
                StatusCode::BAD_REQUEST,
                "Missing or invalid authorization header",
            ),
            AuthError::DatabaseError(_)
            | AuthError::JwtError(_)
            | AuthError::PasswordHashError(_) => {
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
        };

        let body = serde_json::json!({
            "error": error_message,
            "detail": self.to_string(),
        });

        (status, axum::Json(body)).into_response()
    }
}

#[async_trait]
impl<S> FromRequestParts<S> for AuthUser
where
    S: Send + Sync,
{
    type Rejection = AuthError;

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
            .map_err(AuthError::JwtError)?;

            Ok(AuthUser {
                user_id: token_data.claims.sub,
            })
        }
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct LoginRequest {
    pub username: String,
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
