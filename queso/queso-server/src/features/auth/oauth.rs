use axum::{Json, extract::State, response::IntoResponse};
use base64::{Engine as _, engine::general_purpose::URL_SAFE};
use oauth2::{
    AuthUrl, AuthorizationCode, ClientId, ClientSecret, CsrfToken, EndpointNotSet, EndpointSet,
    PkceCodeChallenge, RedirectUrl, Scope, TokenResponse, TokenUrl, basic::BasicClient,
};
use serde::Serialize;
use utoipa::ToSchema;

use crate::features::users::{model::GoogleUser, service::UserService};

use super::{
    model::{AuthError, LoginResponse, OAuthCallback},
    service::AuthService,
};

#[derive(Clone)]
pub struct OAuthConfig {
    pub client:
        BasicClient<EndpointSet, EndpointNotSet, EndpointNotSet, EndpointNotSet, EndpointSet>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct OAuthUrlResponse {
    pub url: String,
}

impl OAuthConfig {
    pub fn new(
        client_id: String,
        client_secret: String,
        auth_url: String,
        token_url: String,
        redirect_url: String,
    ) -> Result<Self, AuthError> {
        let client = BasicClient::new(ClientId::new(client_id))
            .set_client_secret(ClientSecret::new(client_secret))
            .set_redirect_uri(
                RedirectUrl::new(redirect_url).map_err(|e| AuthError::OAuthError(e.to_string()))?,
            )
            .set_auth_uri(AuthUrl::new(auth_url).map_err(|e| AuthError::OAuthError(e.to_string()))?)
            .set_token_uri(
                TokenUrl::new(token_url).map_err(|e| AuthError::OAuthError(e.to_string()))?,
            );

        Ok(Self { client })
    }
}

// Create a new type that combines all the services we need
#[derive(Clone)]
pub struct OAuthState {
    pub oauth_config: OAuthConfig,
    pub auth_service: AuthService,
    pub user_service: UserService,
}

/// Initiate Google OAuth login
#[utoipa::path(
    get,
    path = "/api/auth/google/login",
    responses(
        (status = 200, description = "Successfully generated OAuth URL", body = OAuthUrlResponse),
        (status = 500, description = "Failed to generate OAuth URL")
    ),
    tag = "auth"
)]
pub async fn google_login(State(state): State<OAuthState>) -> Result<impl IntoResponse, AuthError> {
    // Generate a PKCE challenge
    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    // Encode the verifier in the state parameter
    let state_data = URL_SAFE.encode(pkce_verifier.secret());

    let (auth_url, _csrf_token) = state
        .oauth_config
        .client
        .authorize_url(|| CsrfToken::new(state_data))
        // Set the desired scopes
        .add_scope(Scope::new("profile".to_string()))
        .add_scope(Scope::new("email".to_string()))
        // Set the PKCE code challenge
        .set_pkce_challenge(pkce_challenge)
        .url();

    Ok(Json(OAuthUrlResponse {
        url: auth_url.to_string(),
    }))
}

/// Handle Google OAuth callback
#[utoipa::path(
    post,
    path = "/api/auth/google/callback",
    request_body = OAuthCallback,
    responses(
        (status = 200, description = "Successfully authenticated with Google", body = LoginResponse),
        (status = 400, description = "Invalid callback parameters"),
        (status = 500, description = "Authentication failed")
    ),
    tag = "auth"
)]
pub async fn google_callback(
    State(state): State<OAuthState>,
    Json(params): Json<OAuthCallback>,
) -> Result<Json<LoginResponse>, AuthError> {
    let http_client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| AuthError::OAuthError(e.to_string()))?;

    // Decode the PKCE verifier from the state parameter
    let pkce_verifier = URL_SAFE
        .decode(params.state)
        .map_err(|e| AuthError::OAuthError(format!("Failed to decode state: {}", e)))?;
    let pkce_verifier = String::from_utf8(pkce_verifier)
        .map_err(|e| AuthError::OAuthError(format!("Invalid state encoding: {}", e)))?;

    let token = state
        .oauth_config
        .client
        .exchange_code(AuthorizationCode::new(params.code))
        .set_pkce_verifier(oauth2::PkceCodeVerifier::new(pkce_verifier))
        .request_async(&http_client)
        .await
        .map_err(|e| AuthError::OAuthError(e.to_string()))?;

    // Get user info from Google
    let client = reqwest::Client::new();
    let userinfo_url =
        std::env::var("GOOGLE_USERINFO_URL").expect("GOOGLE_USERINFO_URL must be set");
    let user_data = client
        .get(userinfo_url)
        .bearer_auth(token.access_token().secret())
        .send()
        .await
        .map_err(|e| AuthError::OAuthError(e.to_string()))?
        .json::<GoogleUser>()
        .await
        .map_err(|e| AuthError::OAuthError(e.to_string()))?;

    // Check if user exists by google_id
    let user = match state.user_service.find_by_google_id(&user_data.id).await {
        Ok(user) => user,
        Err(_) => {
            // Create new user if not exists
            let new_user = crate::features::users::model::NewUser::from_google_user(user_data);
            state.user_service.create_user(new_user).await?
        }
    };

    // Generate JWT token
    let token = state.auth_service.generate_token(user.id)?;

    Ok(Json(LoginResponse::new(token)))
}
