import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { randomBytes } from "crypto";
import { AppConfig } from "./config";

/**
 * Generates a random string for use in resource names.
 * AWS Secrets Manager has a feature where deleted secrets are retained for recovery
 * for a period of time (usually 7-30 days). During this time, you cannot create
 * a new secret with the same name. This can cause issues during development or
 * when frequently destroying/recreating infrastructure.
 *
 * By using a random suffix, we ensure each secret has a unique name, avoiding
 * conflicts with deleted secrets that are still in the recovery period.
 */
function generateRandomSuffix(): string {
  return randomBytes(4).toString("hex");
}

export interface SecretsManagerConfig {
  config: AppConfig;
  prefix: string;
  environment: string;
}

export interface SecretsManagerResult {
  secret: aws.secretsmanager.Secret;
  secretVersion: aws.secretsmanager.SecretVersion;
  executionRole: aws.iam.Role;
}

export function createSecrets(
  args: SecretsManagerConfig
): SecretsManagerResult {
  const secretSuffix = generateRandomSuffix();

  // Create Secrets Manager secret for sensitive environment variables
  const secret = new aws.secretsmanager.Secret(
    `${args.prefix}-app-secrets-${secretSuffix}`,
    {
      name: `${args.prefix}-${args.environment}-app-secrets-${secretSuffix}`,
      description: `Application secrets for the Queso application (${args.environment})`,
      tags: {
        Name: `${args.prefix}-app-secrets`,
        Environment: args.environment,
        RandomSuffix: secretSuffix, // Tag to help identify the secret
      },
    }
  );

  // Store sensitive values in Secrets Manager
  const secretVersion = new aws.secretsmanager.SecretVersion(
    `${args.prefix}-app-secrets-version-${secretSuffix}`,
    {
      secretId: secret.id,
      secretString: pulumi.jsonStringify({
        JWT_SECRET: args.config.jwtSecret,
        GOOGLE_CLIENT_ID: args.config.googleClientId,
        GOOGLE_CLIENT_SECRET: args.config.googleClientSecret,
        SENTRY_DSN: args.config.sentryDsn,
        POSTHOG_API_KEY: args.config.posthogApiKey,
      }),
    }
  );

  // Create ECS Task Execution Role with permissions to read secrets
  const executionRole = new aws.iam.Role(`${args.prefix}-task-execution-role`, {
    assumeRolePolicy: JSON.stringify({
      Version: "2012-10-17",
      Statement: [
        {
          Action: "sts:AssumeRole",
          Effect: "Allow",
          Principal: {
            Service: "ecs-tasks.amazonaws.com",
          },
        },
      ],
    }),
  });

  // Attach required policies to Task Execution Role
  new aws.iam.RolePolicyAttachment(`${args.prefix}-task-execution-policy`, {
    role: executionRole.name,
    policyArn:
      "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
  });

  // Add policy for reading secrets
  new aws.iam.RolePolicy(`${args.prefix}-secrets-policy`, {
    role: executionRole.name,
    policy: pulumi.jsonStringify({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["secretsmanager:GetSecretValue", "kms:Decrypt"],
          Resource: [secret.arn],
        },
      ],
    }),
  });

  return {
    secret,
    secretVersion,
    executionRole,
  };
}
