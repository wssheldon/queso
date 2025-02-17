# Queso ECS Infrastructure

This directory contains the Pulumi infrastructure code for deploying the Queso application to Amazon ECS.

## Prerequisites

- Node.js 20 or later
- AWS CLI configured with appropriate credentials
- Pulumi CLI installed
- Docker installed

## Infrastructure Components

The infrastructure consists of:

- VPC with public and private subnets
- ECS Fargate cluster
- Application Load Balancer
- ECR repository
- CloudWatch log group
- Security groups
- IAM roles and policies

## Configuration

The infrastructure can be configured through Pulumi config and environment variables:

```bash
# Set AWS region
pulumi config set aws:region us-east-1

# Set environment
pulumi config set environment prod
```

## Deployment

The infrastructure is automatically deployed through GitHub Actions when changes are pushed to the main branch. However, you can also deploy manually:

```bash
# Initialize a new stack
pulumi stack init prod

# Set required configuration
pulumi config set aws:region us-east-1

# Preview changes
pulumi preview

# Deploy changes
pulumi up
```

## GitHub Actions Setup

The following secrets need to be configured in GitHub:

- `AWS_ACCESS_KEY_ID`: AWS access key with appropriate permissions
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `PULUMI_ACCESS_TOKEN`: Pulumi access token for state management

## Architecture

The application runs in ECS Fargate with the following setup:

- Application runs in private subnets
- Load balancer in public subnets
- NAT Gateway for outbound internet access
- Container logs sent to CloudWatch
- Auto-scaling based on CPU/Memory utilization

## Monitoring

- Application logs are available in CloudWatch Logs
- Container insights are enabled for monitoring
- ALB metrics are available in CloudWatch
- Health checks are configured on the target group

## Security

- All resources are deployed with least privilege principles
- Containers run in private subnets
- Security groups restrict access appropriately
- Secrets are managed through GitHub Actions secrets

## Costs

The main cost components are:

- ECS Fargate instances
- Application Load Balancer
- NAT Gateway
- CloudWatch Logs

Consider using Savings Plans or Reserved Instances for cost optimization in production.
