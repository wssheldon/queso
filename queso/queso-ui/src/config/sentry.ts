import * as Sentry from '@sentry/react';
import { getEnvVar } from './env';

const ENABLE_SENTRY = getEnvVar('enableSentry');
const SENTRY_DSN = getEnvVar('sentryDsn');
const SENTRY_ENVIRONMENT = getEnvVar('sentryEnvironment');
const TRACES_SAMPLE_RATE = getEnvVar('sentryTracesSampleRate');
const REPLAYS_SAMPLE_RATE = getEnvVar('sentryReplaysSampleRate');
const ERROR_REPLAYS_SAMPLE_RATE = getEnvVar('sentryErrorReplaysSampleRate');

export const initSentry = () => {
  if (!ENABLE_SENTRY || !SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: SENTRY_ENVIRONMENT,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    // Performance Monitoring
    tracesSampleRate: TRACES_SAMPLE_RATE,
    tracePropagationTargets: ['localhost', new RegExp(`^${getEnvVar('apiBaseUrl')}`)],
    // Session Replay
    replaysSessionSampleRate: REPLAYS_SAMPLE_RATE,
    replaysOnErrorSampleRate: ERROR_REPLAYS_SAMPLE_RATE,
    // Only enable in production
    enabled: import.meta.env.PROD,
  });
};

// Re-export Sentry for manual error capturing and other features
export const SentrySDK = {
  captureException: (error: unknown, context?: Record<string, unknown>) => {
    if (!ENABLE_SENTRY || !SENTRY_DSN) {
      // Log to console in development
      if (import.meta.env.DEV) {
        console.error('Sentry would capture:', error);
        if (context) console.error('With context:', context);
      }
      return;
    }
    Sentry.captureException(error, { extra: context });
  },

  captureMessage: (message: string, context?: Record<string, unknown>) => {
    if (!ENABLE_SENTRY || !SENTRY_DSN) {
      // Log to console in development
      if (import.meta.env.DEV) {
        console.info('Sentry would log:', message);
        if (context) console.info('With context:', context);
      }
      return;
    }
    Sentry.captureMessage(message, { extra: context });
  },

  setUser: (user: { id: string; email?: string; username?: string } | null) => {
    if (!ENABLE_SENTRY || !SENTRY_DSN) {
      return;
    }
    Sentry.setUser(user);
  },

  setTag: (key: string, value: string) => {
    if (!ENABLE_SENTRY || !SENTRY_DSN) {
      return;
    }
    Sentry.setTag(key, value);
  },

  setExtra: (key: string, value: unknown) => {
    if (!ENABLE_SENTRY || !SENTRY_DSN) {
      return;
    }
    Sentry.setExtra(key, value);
  },
};
