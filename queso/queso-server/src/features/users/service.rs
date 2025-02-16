use super::{
    model::{NewUser, User},
    repository::UserRepository,
};

#[derive(Clone)]
pub struct UserService {
    repository: UserRepository,
}

impl UserService {
    pub fn new(repository: UserRepository) -> Self {
        Self { repository }
    }

    pub async fn create_user(&self, new_user: NewUser) -> Result<User, String> {
        self.repository.create(&new_user).map_err(|e| e.to_string())
    }

    pub async fn list_users(&self) -> Result<Vec<User>, String> {
        self.repository.list().map_err(|e| e.to_string())
    }
}
