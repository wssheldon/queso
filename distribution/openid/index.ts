import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const prefix = config.get("prefix") || "queso";
const repoName = config.get("githubRepo") || "*"; // e.g., "your-org/your-repo"
const stateBucket = "queso-state"; // Your Pulumi state bucket

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

// Create custom policy for S3 state bucket access
const stateBucketPolicy = new aws.iam.Policy("state-bucket-policy", {
  name: `${prefix}-state-bucket-policy`,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["s3:GetObject", "s3:PutObject", "s3:ListBucket"],
        Resource: [
          `arn:aws:s3:::${stateBucket}`,
          `arn:aws:s3:::${stateBucket}/*`,
        ],
      },
    ],
  },
});

// Create custom policy for additional ECS permissions
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
          // Additional ECS permissions
          "ecs:DescribeServices",
          "ecs:UpdateService",
          "ecs:DescribeTaskDefinition",
          "ecs:RegisterTaskDefinition",
          "iam:PassRole",
          // Load Balancer permissions
          "elasticloadbalancing:Describe*",
          "elasticloadbalancing:DeregisterInstancesFromLoadBalancer",
          "elasticloadbalancing:RegisterInstancesWithLoadBalancer",
          "elasticloadbalancing:RegisterTargets",
          "elasticloadbalancing:DeregisterTargets",
        ],
        Resource: "*",
      },
    ],
  },
});

// Attach all required policies
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

// Export the role ARN
export const roleArn = githubActionsRole.arn;
