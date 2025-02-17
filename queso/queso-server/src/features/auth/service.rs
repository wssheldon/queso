use crate::features::users::{model::User, service::UserService};
use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordVerifier},
};
use jsonwebtoken::{Header, encode};

use super::model::{
    AuthError, Claims, EmailLoginRequest, KEYS, LoginResponse, UsernameLoginRequest,
};

#[derive(Clone)]
pub struct AuthService {
    user_service: UserService,
}

impl AuthService {
    pub fn new(user_service: UserService) -> Self {
        Self { user_service }
    }

    pub async fn login_with_username(
        &self,
        login_request: UsernameLoginRequest,
    ) -> Result<LoginResponse, AuthError> {
        let user = self
            .user_service
            .find_by_username(&login_request.username)
            .await?;

        self.verify_password_and_generate_token(user, login_request.password)
            .await
    }

    pub async fn login_with_email(
        &self,
        login_request: EmailLoginRequest,
    ) -> Result<LoginResponse, AuthError> {
        let user = self
            .user_service
            .find_by_email(&login_request.email)
            .await?;

        self.verify_password_and_generate_token(user, login_request.password)
            .await
    }

    async fn verify_password_and_generate_token(
        &self,
        user: User,
        password: String,
    ) -> Result<LoginResponse, AuthError> {
        let parsed_hash = PasswordHash::new(&user.password_hash)?;

        if Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_err()
        {
            return Err(AuthError::InvalidCredentials(
                "Invalid password".to_string(),
            ));
        }

        let token = self.generate_token(user.id)?;
        Ok(LoginResponse::new(token))
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

    pub async fn invalidate_session(&self, _user_id: i32) -> Result<(), AuthError> {
        // In a production environment, you would:
        // 1. Add the token to a blacklist in Redis/database
        // 2. Clear any session data
        // 3. Revoke refresh tokens if implemented
        // For now, we'll just return Ok as the client will remove the token
        Ok(())
    }
}

impl From<argon2::password_hash::Error> for AuthError {
    fn from(_: argon2::password_hash::Error) -> Self {
        AuthError::InvalidCredentials("Invalid password".to_string())
    }
}
