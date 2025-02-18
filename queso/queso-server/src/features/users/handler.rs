use axum::{
    Json,
    extract::Path,
    extract::State,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

#[derive(Deserialize, ToSchema)]
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
            UserError::UsernameExists => {
                (StatusCode::CONFLICT, "Username already exists".to_string())
            }
            UserError::EmailExists => (StatusCode::CONFLICT, "Email already exists".to_string()),
            UserError::PasswordHashError(_) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Error processing password".to_string(),
            ),
            UserError::DatabaseError(e) => (
                StatusCode::INTERNAL_SERVER_ERROR,
                format!("Database error: {}", e),
            ),
            UserError::OAuthError(msg) => (StatusCode::UNAUTHORIZED, msg),
            UserError::InternalError => (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Internal server error".to_string(),
            ),
        };

        let body = Json(ErrorResponse {
            error: error_message,
        });

        (status, body).into_response()
    }
}

/// Get a user by ID
#[utoipa::path(
    get,
    path = "/api/users/{id}",
    responses(
        (status = 200, description = "User found successfully", body = User),
        (status = 404, description = "User not found")
    ),
    params(
        ("id" = i32, Path, description = "User ID")
    ),
    tag = "users"
)]
pub async fn get_user(
    State(service): State<UserService>,
    Path(id): Path<i32>,
) -> Result<Json<User>, StatusCode> {
    match service.get_user(id).await {
        Ok(user) => Ok(Json(user)),
        Err(_) => Err(StatusCode::NOT_FOUND),
    }
}

/// Get all users
#[utoipa::path(
    get,
    path = "/api/users",
    responses(
        (status = 200, description = "List all users", body = Vec<User>)
    ),
    tag = "users"
)]
pub async fn get_users(State(service): State<UserService>) -> Result<Json<Vec<User>>, StatusCode> {
    match service.get_users().await {
        Ok(users) => Ok(Json(users)),
        Err(_) => Err(StatusCode::INTERNAL_SERVER_ERROR),
    }
}

/// Create a new user
#[utoipa::path(
    post,
    path = "/api/users",
    request_body = CreateUserRequest,
    responses(
        (status = 201, description = "User created successfully", body = User),
        (status = 400, description = "Invalid user data"),
        (status = 409, description = "User already exists")
    ),
    tag = "users"
)]
pub async fn create_user(
    State(service): State<UserService>,
    Json(new_user_request): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<User>), UserError> {
    let new_user = NewUser::from_request(
        new_user_request.username,
        new_user_request.email,
        new_user_request.password,
    )?;

    match service.create_user(new_user).await {
        Ok(user) => Ok((StatusCode::CREATED, Json(user))),
        Err(err) => Err(err),
    }
}

/// Delete a user
#[utoipa::path(
    delete,
    path = "/api/users/{id}",
    responses(
        (status = 204, description = "User deleted successfully"),
        (status = 404, description = "User not found")
    ),
    params(
        ("id" = i32, Path, description = "User ID")
    ),
    tag = "users"
)]
pub async fn delete_user(State(service): State<UserService>, Path(id): Path<i32>) -> StatusCode {
    match service.delete_user(id).await {
        Ok(_) => StatusCode::NO_CONTENT,
        Err(_) => StatusCode::NOT_FOUND,
    }
}
