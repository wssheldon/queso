use super::{
    model::{NewUser, User, UserError},
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

    pub async fn create_user(&self, new_user: NewUser) -> Result<User, UserError> {
        // Check if username exists
        if let Ok(_) = self.repository.find_by_username(&new_user.username) {
            return Err(UserError::UsernameExists);
        }

        // Check if email exists
        if let Ok(_) = self.repository.find_by_email(&new_user.email) {
            return Err(UserError::EmailExists);
        }

        // Create user
        self.repository
            .create(&new_user)
            .map_err(UserError::DatabaseError)
    }

    pub async fn list_users(&self) -> Result<Vec<User>, UserError> {
        self.repository.list().map_err(UserError::DatabaseError)
    }
}
