use axum::{
    Json,
    extract::{Query, State},
    response::{IntoResponse, Redirect},
};
use oauth2::{
    AuthUrl, AuthorizationCode, ClientId, ClientSecret, CsrfToken, EndpointNotSet, EndpointSet,
    PkceCodeChallenge, RedirectUrl, Scope, TokenResponse, TokenUrl,
    basic::{BasicClient, BasicErrorResponse, BasicTokenResponse, BasicTokenType},
};
use serde::{Deserialize, Serialize};
use url::Url;

use crate::features::users::{model::GoogleUser, service::UserService};

use super::{model::AuthError, service::AuthService};

#[derive(Clone)]
pub struct OAuthConfig {
    pub client:
        BasicClient<EndpointSet, EndpointNotSet, EndpointNotSet, EndpointNotSet, EndpointSet>,
    pub pkce_verifier: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct OAuthUrlResponse {
    pub url: String,
}

#[derive(Debug, Deserialize)]
pub struct OAuthCallback {
    pub code: String,
    pub state: String,
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

        Ok(Self {
            client,
            pkce_verifier: None,
        })
    }
}

// Create a new type that combines all the services we need
#[derive(Clone)]
pub struct OAuthState {
    pub oauth_config: OAuthConfig,
    pub auth_service: AuthService,
    pub user_service: UserService,
}

pub async fn google_login(
    State(mut state): State<OAuthState>,
) -> Result<impl IntoResponse, AuthError> {
    // Generate a PKCE challenge
    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    // Store the verifier for later use
    state.oauth_config.pkce_verifier = Some(pkce_verifier.secret().to_string());

    let (auth_url, _csrf_token) = state
        .oauth_config
        .client
        .authorize_url(CsrfToken::new_random)
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

pub async fn google_callback(
    Query(params): Query<OAuthCallback>,
    State(state): State<OAuthState>,
) -> Result<impl IntoResponse, AuthError> {
    let http_client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|e| AuthError::OAuthError(e.to_string()))?;

    let token = state
        .oauth_config
        .client
        .exchange_code(AuthorizationCode::new(params.code))
        .request_async(&http_client)
        .await
        .map_err(|e| AuthError::OAuthError(e.to_string()))?;

    // Get user info from Google
    let client = reqwest::Client::new();
    let user_data = client
        .get("https://www.googleapis.com/oauth2/v2/userinfo")
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

    // Redirect to frontend with token
    let mut frontend_url = Url::parse("http://localhost:5173").unwrap();
    frontend_url.set_path("/oauth/callback");
    frontend_url.query_pairs_mut().append_pair("token", &token);

    Ok(Redirect::to(frontend_url.as_str()))
}
