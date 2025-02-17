# Queso OpenID Connect Setup

This directory contains the Pulumi infrastructure code for setting up OpenID Connect (OIDC) authentication between GitHub Actions and AWS.

## Overview

This setup creates:

- An OIDC provider for GitHub Actions in AWS
- An IAM role that can be assumed by GitHub Actions
- Required policy attachments for ECS/ECR access

## Prerequisites

- Node.js 20 or later
- AWS CLI configured with appropriate credentials
- Pulumi CLI installed

## Configuration

You can configure the following settings:

```bash
# Set the prefix for resource names (default: queso)
pulumi config set prefix your-prefix

# Set the GitHub repository name (default: *)
# Format: org-name/repo-name
pulumi config set githubRepo your-org/your-repo
```

## Deployment

This should be deployed independently from your main infrastructure, as it sets up the authentication mechanism that other deployments will use:

```bash
# Initialize a new stack
pulumi stack init openid

# Configure AWS region
pulumi config set aws:region us-east-1

# Deploy the OIDC infrastructure
pulumi up

# Get the role ARN
pulumi stack output roleArn
```

## Using with GitHub Actions

1. Deploy this stack first
2. Get the role ARN from the stack outputs:
   ```bash
   pulumi stack output roleArn
   ```
3. Add the role ARN as a GitHub secret named `AWS_ROLE_ARN`
4. The GitHub Actions workflow will use this role for AWS authentication

## Security Considerations

- The role is configured to only be assumable by GitHub Actions
- The trust relationship is scoped to your repository (or all repositories if `githubRepo` is set to `*`)
- The role has only the permissions needed for ECS/ECR operations
- No long-lived AWS credentials are stored in GitHub
- Token-based authentication with short-lived credentials
- Automatic token rotation and management

## Why Separate?

This configuration is separated from the main infrastructure because:

1. It's a one-time setup that establishes the authentication mechanism
2. It requires elevated IAM permissions to set up
3. It's shared across multiple deployments and environments
4. Changes to authentication should be managed independently from application infrastructure
5. It follows the principle of separation of concerns
