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
        if self.repository.find_by_username(&new_user.username).is_ok() {
            return Err(UserError::UsernameExists);
        }

        // Check if email exists
        if self.repository.find_by_email(&new_user.email).is_ok() {
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

    pub async fn find_by_google_id(&self, google_id: &str) -> Result<User, UserError> {
        self.repository
            .find_by_google_id(google_id)
            .map_err(UserError::DatabaseError)
    }

    pub async fn find_by_username(&self, username: &str) -> Result<User, UserError> {
        self.repository
            .find_by_username(username)
            .map_err(UserError::DatabaseError)
    }

    pub async fn find_by_email(&self, email: &str) -> Result<User, UserError> {
        self.repository
            .find_by_email(email)
            .map_err(UserError::DatabaseError)
    }

    pub async fn find_by_id(&self, id: i32) -> Result<User, UserError> {
        self.repository
            .find_by_id(id)
            .map_err(UserError::DatabaseError)
    }
}
