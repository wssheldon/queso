use axum::{Json, extract::State, http::StatusCode};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct CreateUserRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

use super::{
    model::{NewUser, User},
    service::UserService,
};

pub async fn create_user(
    State(service): State<UserService>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<Json<User>, StatusCode> {
    let new_user = NewUser::from_request(payload.username, payload.email, payload.password)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    service
        .create_user(new_user)
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

pub async fn list_users(State(service): State<UserService>) -> Result<Json<Vec<User>>, StatusCode> {
    service
        .list_users()
        .await
        .map(Json)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}
