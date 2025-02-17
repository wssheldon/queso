# Queso IAM Setup for GitHub Actions

This directory contains the Pulumi infrastructure code for setting up IAM roles and OIDC provider for GitHub Actions.

## Overview

This setup creates:

- An OIDC provider for GitHub Actions
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

This should be deployed independently from your main infrastructure:

```bash
# Initialize a new stack
pulumi stack init iam

# Configure AWS region
pulumi config set aws:region us-east-1

# Deploy the IAM infrastructure
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
