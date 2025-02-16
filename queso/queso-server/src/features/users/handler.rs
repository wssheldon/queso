use axum::{Json, extract::State, http::StatusCode};

use super::{
    model::{NewUser, User},
    service::UserService,
};

pub async fn create_user(
    State(service): State<UserService>,
    Json(new_user): Json<NewUser>,
) -> Result<Json<User>, StatusCode> {
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
