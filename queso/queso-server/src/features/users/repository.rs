use crate::{
    config::database::DbPool,
    features::users::model::{NewUser, User},
    schema::users,
};
use diesel::prelude::*;

#[derive(Clone)]
pub struct UserRepository {
    pool: DbPool,
}

impl UserRepository {
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    pub fn create(&self, new_user: &NewUser) -> Result<User, diesel::result::Error> {
        let mut conn = self.pool.get().expect("Failed to get db connection");

        diesel::insert_into(users::table)
            .values(new_user)
            .returning(User::as_returning())
            .get_result(&mut conn)
    }

    pub fn list(&self) -> Result<Vec<User>, diesel::result::Error> {
        let mut conn = self.pool.get().expect("Failed to get db connection");
        users::table.select(User::as_select()).load(&mut conn)
    }

    pub fn find_by_username(&self, username: &str) -> Result<User, diesel::result::Error> {
        let mut conn = self.pool.get().expect("Failed to get db connection");
        users::table
            .filter(users::username.eq(username))
            .select(User::as_select())
            .first(&mut conn)
    }

    pub fn find_by_email(&self, email: &str) -> Result<User, diesel::result::Error> {
        let mut conn = self.pool.get().expect("Failed to get db connection");
        users::table
            .filter(users::email.eq(email))
            .select(User::as_select())
            .first(&mut conn)
    }

    pub fn find_by_id(&self, id: i32) -> Result<User, diesel::result::Error> {
        let mut conn = self.pool.get().expect("Failed to get db connection");
        users::table
            .filter(users::id.eq(id))
            .select(User::as_select())
            .first(&mut conn)
    }
}
