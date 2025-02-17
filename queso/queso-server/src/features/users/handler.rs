use axum::{
    Json,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct ErrorResponse {
    error: String,
}

use super::{
    model::{NewUser, User, UserError},
    service::UserService,
};

impl IntoResponse for UserError {
    fn into_response(self) -> Response {
        let (status, error_message) = match self {
            UserError::UsernameExists => (StatusCode::CONFLICT, "Username already exists"),
            UserError::EmailExists => (StatusCode::CONFLICT, "Email already exists"),
            UserError::PasswordHashError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Error processing password",
            ),
            UserError::DatabaseError(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Database error"),
            UserError::InternalError => {
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error")
            }
        };

        let body = Json(ErrorResponse {
            error: error_message.to_string(),
        });

        (status, body).into_response()
    }
}

pub async fn create_user(
    State(service): State<UserService>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<Json<User>, UserError> {
    let new_user = NewUser::from_request(payload.username, payload.email, payload.password)?;
    let user = service.create_user(new_user).await?;
    Ok(Json(user))
}

pub async fn list_users(State(service): State<UserService>) -> Result<Json<Vec<User>>, UserError> {
    let users = service.list_users().await?;
    Ok(Json(users))
}
