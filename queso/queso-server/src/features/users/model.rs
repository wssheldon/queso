use argon2::{
    Argon2,
    password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString, rand_core::OsRng},
};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};
use thiserror::Error;

#[derive(Error, Debug)]
pub enum UserError {
    #[error("Username already exists")]
    UsernameExists,
    #[error("Email already exists")]
    EmailExists,
    #[error("Password hashing error: {0}")]
    PasswordHashError(#[from] argon2::password_hash::Error),
    #[error("Database error: {0}")]
    DatabaseError(#[from] diesel::result::Error),
    #[error("OAuth error: {0}")]
    OAuthError(String),
    #[error("Internal server error")]
    InternalError,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GoogleUser {
    pub id: String,
    pub email: String,
    pub verified_email: bool,
    pub name: String,
    pub given_name: String,
    pub family_name: String,
    pub picture: String,
    pub locale: String,
}

#[derive(Queryable, Selectable, Serialize)]
#[diesel(table_name = crate::schema::users)]
#[diesel(check_for_backend(diesel::pg::Pg))]
pub struct User {
    pub id: i32,
    pub username: String,
    pub email: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub created_at: NaiveDateTime,
    pub google_id: Option<String>,
    pub avatar_url: Option<String>,
}

#[derive(Insertable, Deserialize, Serialize)]
#[diesel(table_name = crate::schema::users)]
pub struct NewUser {
    pub username: String,
    pub email: String,
    #[serde(skip_deserializing, skip_serializing)]
    pub password_hash: String,
    #[serde(default)]
    #[diesel(skip_insertion)]
    pub password: String,
    pub google_id: Option<String>,
    pub avatar_url: Option<String>,
}

impl NewUser {
    pub fn from_request(
        username: String,
        email: String,
        password: String,
    ) -> Result<Self, argon2::password_hash::Error> {
        let salt = SaltString::generate(&mut OsRng);
        let argon2 = Argon2::default();

        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)?
            .to_string();

        Ok(Self {
            username,
            email,
            password_hash,
            password,
            google_id: None,
            avatar_url: None,
        })
    }

    pub fn from_google_user(google_user: GoogleUser) -> Self {
        let username = generate_username_from_email(&google_user.email);
        Self {
            username,
            email: google_user.email,
            password_hash: String::new(), // OAuth users don't need a password
            password: String::new(),
            google_id: Some(google_user.id),
            avatar_url: Some(google_user.picture),
        }
    }
}

impl User {
    pub fn verify_password(&self, password: &str) -> Result<bool, argon2::password_hash::Error> {
        // OAuth users can't login with password
        if self.google_id.is_some() {
            return Ok(false);
        }

        let parsed_hash = PasswordHash::new(&self.password_hash)?;
        Ok(Argon2::default()
            .verify_password(password.as_bytes(), &parsed_hash)
            .is_ok())
    }
}

fn generate_username_from_email(email: &str) -> String {
    email.split('@').next().unwrap_or(email).to_string()
}
