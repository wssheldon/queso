use chrono;
use jsonwebtoken::{EncodingKey, Header, encode};
use once_cell::sync::Lazy;
use std::env;

use crate::features::users::{model::User, service::UserService};

use super::model::{AuthError, Claims};

pub static KEYS: Lazy<Keys> = Lazy::new(|| {
    let secret = env::var("JWT_SECRET").expect("JWT_SECRET must be set");
    Keys::new(secret.as_bytes())
});

pub struct Keys {
    pub encoding: EncodingKey,
}

impl Keys {
    fn new(secret: &[u8]) -> Self {
        Self {
            encoding: EncodingKey::from_secret(secret),
        }
    }
}

#[derive(Clone)]
pub struct AuthService {
    user_service: UserService,
}

impl AuthService {
    pub fn new(user_service: UserService) -> Self {
        Self { user_service }
    }

    pub async fn login(&self, username: String, password: String) -> Result<String, AuthError> {
        let user = self
            .user_service
            .find_by_username(&username)
            .await
            .map_err(|_| {
                AuthError::InvalidCredentials("Invalid username or password".to_string())
            })?;

        if !user
            .verify_password(&password)
            .map_err(|e| AuthError::InvalidCredentials(e.to_string()))?
        {
            return Err(AuthError::InvalidCredentials(
                "Invalid username or password".to_string(),
            ));
        }

        self.generate_token(user.id)
    }

    pub fn generate_token(&self, user_id: i32) -> Result<String, AuthError> {
        let claims = Claims::new(user_id);
        encode(&Header::default(), &claims, &KEYS.encoding).map_err(AuthError::TokenCreation)
    }

    pub async fn get_user(&self, user_id: i32) -> Result<User, AuthError> {
        self.user_service
            .find_by_id(user_id)
            .await
            .map_err(AuthError::UserError)
    }
}
