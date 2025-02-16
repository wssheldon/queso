use crate::{
    config::database::DbPool,
    features::users::model::{NewUser, User},
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
        use crate::schema::users;

        let mut conn = self.pool.get().expect("Failed to get db connection");

        diesel::insert_into(users::table)
            .values(new_user)
            .returning(User::as_returning())
            .get_result(&mut conn)
    }

    pub fn list(&self) -> Result<Vec<User>, diesel::result::Error> {
        use crate::schema::users;

        let mut conn = self.pool.get().expect("Failed to get db connection");

        users::table.select(User::as_select()).load(&mut conn)
    }
}
