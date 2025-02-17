import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const prefix = config.get("prefix") || "queso";
const repoName = config.get("githubRepo") || "*"; // e.g., "your-org/your-repo"

// Create OIDC Provider for GitHub Actions
const githubOidc = new aws.iam.OpenIdConnectProvider("github-actions", {
  url: "https://token.actions.githubusercontent.com",
  clientIdLists: ["sts.amazonaws.com"],
  thumbprintLists: ["6938fd4d98bab03faadb97b34396831e3780aea1"],
});

// Create IAM Role for GitHub Actions
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

// Attach required policies for ECS deployment
const policies = [
  "arn:aws:iam::aws:policy/AmazonECS_FullAccess",
  "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess",
  "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
];

policies.forEach((policyArn, index) => {
  new aws.iam.RolePolicyAttachment(`github-actions-policy-${index}`, {
    role: githubActionsRole.name,
    policyArn: policyArn,
  });
});

// Export the role ARN
export const roleArn = githubActionsRole.arn;
