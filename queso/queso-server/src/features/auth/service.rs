use chrono::{Duration, Utc};
use jsonwebtoken::{Header, encode};

use crate::features::{
    auth::model::{AuthError, Claims, KEYS},
    users::{model::User, repository::UserRepository},
};

#[derive(Clone)]
pub struct AuthService {
    user_repository: UserRepository,
}

impl AuthService {
    pub fn new(user_repository: UserRepository) -> Self {
        Self { user_repository }
    }

    pub async fn login(&self, username: String, password: String) -> Result<String, AuthError> {
        let user = self
            .user_repository
            .find_by_username(&username)
            .map_err(|_| AuthError::WrongCredentials)?;

        if !user
            .verify_password(&password)
            .map_err(AuthError::PasswordHashError)?
        {
            return Err(AuthError::WrongCredentials);
        }

        self.create_token(user)
    }

    pub fn create_token(&self, user: User) -> Result<String, AuthError> {
        let claims = Claims::new(user.id);
        encode(&Header::default(), &claims, &KEYS.encoding).map_err(AuthError::JwtError)
    }

    pub async fn get_user(&self, user_id: i32) -> Result<User, AuthError> {
        self.user_repository
            .find_by_id(user_id)
            .map_err(AuthError::DatabaseError)
    }
}
