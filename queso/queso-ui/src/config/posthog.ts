import posthog from 'posthog-js';
import { getEnvVar } from './env';

const POSTHOG_API_KEY = getEnvVar('posthogApiKey');
const POSTHOG_HOST = getEnvVar('posthogHost');
const ENABLE_ANALYTICS = getEnvVar('enableAnalytics');

export const initPostHog = () => {
  if (!ENABLE_ANALYTICS || !POSTHOG_API_KEY) {
    return;
  }

  posthog.init(POSTHOG_API_KEY, {
    api_host: POSTHOG_HOST,
    loaded: posthog => {
      if (import.meta.env.DEV) {
        // Disable capturing in development
        posthog.opt_out_capturing();
      }
    },
    autocapture: true,
    capture_pageview: true,
    capture_pageleave: true,
  });
};

type PostHogEventProperties = {
  [key: string]: string | number | boolean | null;
};

export const PostHog = {
  capture: (eventName: string, properties?: PostHogEventProperties) => {
    if (!ENABLE_ANALYTICS || !POSTHOG_API_KEY) {
      return;
    }
    posthog.capture(eventName, properties);
  },

  identify: (distinctId: string, properties?: PostHogEventProperties) => {
    if (!ENABLE_ANALYTICS || !POSTHOG_API_KEY) {
      return;
    }
    posthog.identify(distinctId, properties);
  },

  reset: () => {
    if (!ENABLE_ANALYTICS || !POSTHOG_API_KEY) {
      return;
    }
    posthog.reset();
  },
};
