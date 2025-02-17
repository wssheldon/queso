interface EnvConfig {
  apiBaseUrl: string;
  enableAnalytics: boolean;
  posthogApiKey: string;
  posthogHost: string;
}

export const env: EnvConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  posthogApiKey: import.meta.env.VITE_POSTHOG_API_KEY || '',
  posthogHost: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
};

// Type-safe way to access environment variables
export const getEnvVar = <K extends keyof EnvConfig>(key: K): EnvConfig[K] => {
  return env[key];
};
