use utoipa::OpenApi;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::features::users::handler::get_user,
        crate::features::users::handler::get_users,
        crate::features::users::handler::create_user,
        crate::features::users::handler::delete_user,
        crate::features::auth::oauth::google_login,
        crate::features::auth::oauth::google_callback,
    ),
    components(
        schemas(
            crate::features::users::model::User,
            crate::features::users::model::NewUser,
            crate::features::users::model::GoogleUser,
            crate::features::auth::model::LoginResponse,
            crate::features::auth::model::OAuthCallback,
        )
    ),
    tags(
        (name = "users", description = "User management endpoints"),
        (name = "auth", description = "Authentication endpoints")
    ),
    info(
        title = "Queso API",
        version = env!("CARGO_PKG_VERSION"),
        description = "REST API for Queso application",
        license(
            name = "MIT",
            url = "https://github.com/wssheldon/queso/blob/main/LICENSE"
        ),
        contact(
            name = "Queso Team",
            email = "team@queso.com",
            url = "https://queso.com"
        )
    )
)]
pub struct ApiDoc;
