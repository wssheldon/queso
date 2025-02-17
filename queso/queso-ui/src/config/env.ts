interface EnvConfig {
  apiBaseUrl: string;
  enableAnalytics: boolean;
  posthogApiKey: string;
  posthogHost: string;
  enableSentry: boolean;
  sentryDsn: string;
  sentryEnvironment: string;
  sentryTracesSampleRate: number;
  sentryReplaysSampleRate: number;
  sentryErrorReplaysSampleRate: number;
}

export const env: EnvConfig = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  posthogApiKey: import.meta.env.VITE_POSTHOG_API_KEY || '',
  posthogHost: import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com',
  enableSentry: import.meta.env.VITE_ENABLE_SENTRY === 'true',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',
  sentryEnvironment: import.meta.env.VITE_SENTRY_ENVIRONMENT || 'development',
  sentryTracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE || '1.0'),
  sentryReplaysSampleRate: Number(import.meta.env.VITE_SENTRY_REPLAYS_SAMPLE_RATE || '0.1'),
  sentryErrorReplaysSampleRate: Number(
    import.meta.env.VITE_SENTRY_ERROR_REPLAYS_SAMPLE_RATE || '1.0'
  ),
};

export const getEnvVar = <K extends keyof EnvConfig>(key: K): EnvConfig[K] => {
  return env[key];
};
