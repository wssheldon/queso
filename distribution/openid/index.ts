/**
 * AWS OpenID Connect (OIDC) Configuration for GitHub Actions
 *
 * This module sets up OIDC authentication between GitHub Actions and AWS, eliminating
 * the need for long-lived AWS credentials stored as GitHub secrets.
 *
 * Key components:
 * 1. OIDC Provider - Establishes trust between GitHub and AWS
 * 2. IAM Role - Assumes the identity with specific permissions
 * 3. Trust Policy - Controls which GitHub workflows can assume the role
 *
 * @see https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
 */

import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const prefix = config.get("prefix") || "queso";
const repoName = config.get("githubRepo") || "*"; // e.g., "your-org/your-repo"
const stateBucket = "queso-state"; // Your Pulumi state bucket

/**
 * Creates an OIDC Provider for GitHub Actions in AWS IAM.
 * This establishes the trust relationship between GitHub and AWS.
 *
 * The thumbprint list is GitHub's OIDC token signing certificate thumbprint.
 * @see https://token.actions.githubusercontent.com/.well-known/openid-configuration
 */
const githubOidc = new aws.iam.OpenIdConnectProvider("github-actions", {
  url: "https://token.actions.githubusercontent.com",
  clientIdLists: ["sts.amazonaws.com"],
  thumbprintLists: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
});

/**
 * Creates an IAM Role that can be assumed by GitHub Actions.
 * The trust policy includes conditions that limit which GitHub workflows
 * can assume this role, following AWS security best practices.
 *
 * @see https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_create_for-idp_oidc.html
 */
const githubActionsRole = new aws.iam.Role("github-actions-role", {
  name: `${prefix}-github-actions-role`,
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          Federated: githubOidc.arn,
        },
        Action: "sts:AssumeRoleWithWebIdentity",
        Condition: {
          StringLike: {
            "token.actions.githubusercontent.com:sub": `repo:${repoName}:*`,
          },
          StringEquals: {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          },
        },
      },
    ],
  },
});

/**
 * Creates an IAM Policy for Pulumi state management in S3.
 * Grants necessary permissions to read, write, and list objects
 * in the Pulumi state bucket.
 *
 * Required permissions:
 * - s3:GetObject - Read state files
 * - s3:PutObject - Write state files
 * - s3:ListBucket - List state files
 * - s3:DeleteObject - Clean up old state files
 */
const stateBucketPolicy = new aws.iam.Policy("state-bucket-policy", {
  name: `${prefix}-state-bucket-policy`,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket",
          "s3:DeleteObject",
        ],
        Resource: [
          `arn:aws:s3:::${stateBucket}`,
          `arn:aws:s3:::${stateBucket}/*`,
        ],
      },
    ],
  },
});

/**
 * Creates an IAM Policy for ECS deployment operations.
 * Grants permissions needed for managing ECS services, tasks,
 * CloudWatch logs, and Load Balancer configurations.
 *
 * Key permission groups:
 * - CloudWatch Logs - For container logging
 * - ECS - For service and task management
 * - IAM - For task role operations
 * - Load Balancer - For service discovery and routing
 * - EC2 - For VPC and networking resources
 */
const ecsDeployPolicy = new aws.iam.Policy("ecs-deploy-policy", {
  name: `${prefix}-ecs-deploy-policy`,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: [
          // CloudWatch Logs permissions
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:TagResource",
          "logs:PutRetentionPolicy",
          // Additional ECS permissions
          "ecs:DescribeServices",
          "ecs:UpdateService",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "ecs:CreateCluster",
          "ecs:DeleteCluster",
          // IAM permissions
          "iam:CreateRole",
          "iam:DeleteRole",
          "iam:GetRole",
          "iam:PutRolePolicy",
          "iam:DeleteRolePolicy",
          "iam:ListRolePolicies",
          "iam:ListAttachedRolePolicies",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:PassRole",
          // Load Balancer permissions
          "elasticloadbalancing:Describe*",
          "elasticloadbalancing:DeregisterInstancesFromLoadBalancer",
          "elasticloadbalancing:RegisterInstancesWithLoadBalancer",
          "elasticloadbalancing:RegisterTargets",
          "elasticloadbalancing:DeregisterTargets",
          "elasticloadbalancing:CreateLoadBalancer",
          "elasticloadbalancing:DeleteLoadBalancer",
          "elasticloadbalancing:CreateTargetGroup",
          "elasticloadbalancing:DeleteTargetGroup",
          "elasticloadbalancing:CreateListener",
          "elasticloadbalancing:DeleteListener",
          // EC2 permissions for VPC and networking
          "ec2:CreateVpc",
          "ec2:DeleteVpc",
          "ec2:CreateTags",
          "ec2:DeleteTags",
          "ec2:CreateSubnet",
          "ec2:DeleteSubnet",
          "ec2:CreateRouteTable",
          "ec2:DeleteRouteTable",
          "ec2:CreateRoute",
          "ec2:DeleteRoute",
          "ec2:CreateInternetGateway",
          "ec2:DeleteInternetGateway",
          "ec2:CreateNatGateway",
          "ec2:DeleteNatGateway",
          "ec2:CreateSecurityGroup",
          "ec2:DeleteSecurityGroup",
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:RevokeSecurityGroupIngress",
          "ec2:AuthorizeSecurityGroupEgress",
          "ec2:RevokeSecurityGroupEgress",
          "ec2:AllocateAddress",
          "ec2:ReleaseAddress",
          "ec2:AssociateRouteTable",
          "ec2:DisassociateRouteTable",
          "ec2:AttachInternetGateway",
          "ec2:DetachInternetGateway",
          "ec2:ModifyVpcAttribute",
          "ec2:DescribeVpcs",
          "ec2:DescribeSubnets",
          "ec2:DescribeRouteTables",
          "ec2:DescribeInternetGateways",
          "ec2:DescribeNatGateways",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeAddresses",
          "ec2:DescribeAvailabilityZones",
          "ec2:DescribeVpcAttribute",
        ],
        Resource: "*",
      },
    ],
  },
});

/**
 * AWS managed policies required for ECS deployment.
 * These provide the core permissions needed for ECS and ECR operations.
 *
 * Policies:
 * - AmazonECS_FullAccess - Manage ECS clusters and services
 * - AmazonEC2ContainerRegistryFullAccess - Manage container images
 * - AmazonECSTaskExecutionRolePolicy - Execute ECS tasks
 */
const policies = [
  "arn:aws:iam::aws:policy/AmazonECS_FullAccess",
  "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess",
  "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
];

// Attach AWS managed policies
policies.forEach((policyArn, index) => {
  new aws.iam.RolePolicyAttachment(`github-actions-policy-${index}`, {
    role: githubActionsRole.name,
    policyArn: policyArn,
  });
});

// Attach custom policies
new aws.iam.RolePolicyAttachment("state-bucket-policy-attachment", {
  role: githubActionsRole.name,
  policyArn: stateBucketPolicy.arn,
});

new aws.iam.RolePolicyAttachment("ecs-deploy-policy-attachment", {
  role: githubActionsRole.name,
  policyArn: ecsDeployPolicy.arn,
});

// Export the role ARN for use in GitHub Actions
export const roleArn = githubActionsRole.arn;

// Fix the EIP domain attribute warning
const eip = new aws.ec2.Eip(`${prefix}-eip`, {
  domain: "vpc",
  tags: {
    Name: `${prefix}-eip`,
    Environment: config.get("environment") || "dev",
  },
});
