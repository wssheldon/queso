import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { AppConfig } from "./config";
import { EcrRepository } from "./ecr";
import { DockerBuilder } from "./docker";
import { SecretsManagerResult } from "./secrets";

export interface EcsClusterArgs {
  config: AppConfig;
  vpc: aws.ec2.Vpc;
  publicSubnets: aws.ec2.Subnet[];
  privateSubnets: aws.ec2.Subnet[];
  ecrRepository: EcrRepository;
  dockerImage: DockerBuilder;
  databaseUrl: pulumi.Output<string>;
  databaseSecurityGroup: aws.ec2.SecurityGroup;
  certificateArn?: pulumi.Input<string>;
  secrets: SecretsManagerResult;
  stage?: string;
}

export function createEcsCluster(args: EcsClusterArgs) {
  const deploymentStage = args.stage || "final";
  // Create ECS Cluster
  const cluster = new aws.ecs.Cluster(`${args.config.prefix}-cluster`, {
    tags: {
      Name: `${args.config.prefix}-cluster`,
      Environment: args.config.environment,
    },
  });

  // Create ALB Security Group
  const albSg = new aws.ec2.SecurityGroup(`${args.config.prefix}-alb-sg`, {
    vpcId: args.vpc.id,
    description: "Security group for ALB",
    ingress: [
      {
        protocol: "tcp",
        fromPort: 80,
        toPort: 80,
        cidrBlocks: ["0.0.0.0/0"],
      },
      {
        protocol: "tcp",
        fromPort: 443,
        toPort: 443,
        cidrBlocks: ["0.0.0.0/0"],
      },
    ],
    egress: [
      {
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
      },
    ],
    tags: {
      Name: `${args.config.prefix}-alb-sg`,
      Environment: args.config.environment,
    },
  });

  // Create ECS Security Group
  const ecsSg = new aws.ec2.SecurityGroup(`${args.config.prefix}-ecs-sg`, {
    vpcId: args.vpc.id,
    description: "Security group for ECS tasks",
    ingress: [
      {
        protocol: "tcp",
        fromPort: args.config.containerPort,
        toPort: args.config.containerPort,
        securityGroups: [albSg.id],
      },
    ],
    egress: [
      {
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
      },
    ],
    tags: {
      Name: `${args.config.prefix}-ecs-sg`,
      Environment: args.config.environment,
    },
  });

  // Allow ECS tasks to connect to RDS
  new aws.ec2.SecurityGroupRule(`${args.config.prefix}-ecs-to-rds`, {
    type: "ingress",
    fromPort: 5432,
    toPort: 5432,
    protocol: "tcp",
    sourceSecurityGroupId: ecsSg.id,
    securityGroupId: args.databaseSecurityGroup.id,
  });

  // Create ALB
  const alb = new aws.lb.LoadBalancer(`${args.config.prefix}-alb`, {
    internal: false,
    loadBalancerType: "application",
    securityGroups: [albSg.id],
    subnets: args.publicSubnets.map((subnet) => subnet.id),
    tags: {
      Name: `${args.config.prefix}-alb`,
      Environment: args.config.environment,
    },
  });

  // Create Target Group
  const targetGroup = new aws.lb.TargetGroup(`${args.config.prefix}-tg`, {
    port: args.config.containerPort,
    protocol: "HTTP",
    targetType: "ip",
    vpcId: args.vpc.id,
    healthCheck: {
      enabled: true,
      path: args.config.healthCheckPath,
      port: args.config.containerPort.toString(),
      protocol: "HTTP",
      healthyThreshold: 3,
      unhealthyThreshold: 3,
      timeout: 5,
      interval: 30,
    },
    tags: {
      Name: `${args.config.prefix}-tg`,
      Environment: args.config.environment,
    },
  });

  // Create HTTPS Listener
  const httpsListener = new aws.lb.Listener(
    `${args.config.prefix}-https-listener`,
    {
      loadBalancerArn: alb.arn,
      port: 443,
      protocol: "HTTPS",
      sslPolicy: "ELBSecurityPolicy-TLS13-1-2-2021-06",
      certificateArn: args.certificateArn,
      defaultActions: [
        {
          type: "forward",
          targetGroupArn: targetGroup.arn,
        },
      ],
    }
  );

  // Modify HTTP Listener to redirect to HTTPS
  const httpListener = new aws.lb.Listener(
    `${args.config.prefix}-http-listener`,
    {
      loadBalancerArn: alb.arn,
      port: 80,
      protocol: "HTTP",
      defaultActions: [
        {
          type: "redirect",
          redirect: {
            port: "443",
            protocol: "HTTPS",
            statusCode: "HTTP_301",
          },
        },
      ],
    }
  );

  // Create ECS Task Definition with environment variables and secrets
  const taskDefinition = new aws.ecs.TaskDefinition(
    `${args.config.prefix}-task`,
    {
      family: args.config.prefix,
      cpu: args.config.cpu.toString(),
      memory: args.config.memory.toString(),
      networkMode: "awsvpc",
      requiresCompatibilities: ["FARGATE"],
      executionRoleArn: args.secrets.executionRole.arn,
      containerDefinitions: pulumi.jsonStringify([
        {
          name: args.config.prefix,
          image: args.dockerImage.imageUri,
          essential: true,
          portMappings: [
            {
              containerPort: args.config.containerPort,
              hostPort: args.config.containerPort,
              protocol: "tcp",
            },
          ],
          environment: [
            {
              name: "DATABASE_URL",
              value: args.databaseUrl,
            },
            {
              name: "SERVER_HOST",
              value: "0.0.0.0",
            },
            {
              name: "API_PORT",
              value: args.config.containerPort.toString(),
            },
            {
              name: "GOOGLE_REDIRECT_URL",
              value: pulumi.interpolate`https://${args.config.domainName}/auth/google/callback`,
            },
            {
              name: "GOOGLE_AUTH_URL",
              value: "https://accounts.google.com/o/oauth2/v2/auth",
            },
            {
              name: "GOOGLE_TOKEN_URL",
              value: "https://oauth2.googleapis.com/token",
            },
            {
              name: "GOOGLE_USERINFO_URL",
              value: "https://www.googleapis.com/oauth2/v2/userinfo",
            },
            {
              name: "NODE_ENV",
              value: args.config.environment,
            },
            {
              name: "VITE_API_BASE_URL",
              value: pulumi.interpolate`https://${args.config.domainName}`,
            },
            {
              name: "VITE_ENABLE_ANALYTICS",
              value: args.config.environment === "prod" ? "true" : "false",
            },
            {
              name: "VITE_ENABLE_SENTRY",
              value: args.config.environment === "prod" ? "true" : "false",
            },
            {
              name: "VITE_SENTRY_ENVIRONMENT",
              value: args.config.environment,
            },
            {
              name: "VITE_SENTRY_TRACES_SAMPLE_RATE",
              value: args.config.environment === "prod" ? "0.1" : "1.0",
            },
            {
              name: "VITE_SENTRY_REPLAYS_SAMPLE_RATE",
              value: args.config.environment === "prod" ? "0.1" : "1.0",
            },
            {
              name: "VITE_SENTRY_ERROR_REPLAYS_SAMPLE_RATE",
              value: args.config.environment === "prod" ? "1.0" : "1.0",
            },
          ],
          secrets: [
            {
              name: "JWT_SECRET",
              valueFrom: pulumi.interpolate`${args.secrets.secret.arn}:JWT_SECRET::`,
            },
            {
              name: "GOOGLE_CLIENT_ID",
              valueFrom: pulumi.interpolate`${args.secrets.secret.arn}:GOOGLE_CLIENT_ID::`,
            },
            {
              name: "GOOGLE_CLIENT_SECRET",
              valueFrom: pulumi.interpolate`${args.secrets.secret.arn}:GOOGLE_CLIENT_SECRET::`,
            },
            {
              name: "VITE_SENTRY_DSN",
              valueFrom: pulumi.interpolate`${args.secrets.secret.arn}:SENTRY_DSN::`,
            },
            {
              name: "VITE_POSTHOG_API_KEY",
              valueFrom: pulumi.interpolate`${args.secrets.secret.arn}:POSTHOG_API_KEY::`,
            },
          ],
          logConfiguration: {
            logDriver: "awslogs",
            options: {
              "awslogs-group": `/ecs/${args.config.prefix}/${deploymentStage}`,
              "awslogs-region": args.config.region,
              "awslogs-stream-prefix": "ecs",
            },
          },
        },
      ]),
    }
  );

  // Create CloudWatch Log Group with unique name
  const logGroup = new aws.cloudwatch.LogGroup(
    `${args.config.prefix}-logs-${deploymentStage}`,
    {
      name: `/ecs/${args.config.prefix}/${deploymentStage}`,
      retentionInDays: 30,
      tags: {
        Name: `${args.config.prefix}-logs`,
        Environment: args.config.environment,
        Stage: deploymentStage,
      },
    }
  );

  // Create ECS Service
  const service = new aws.ecs.Service(`${args.config.prefix}-service`, {
    cluster: cluster.arn,
    desiredCount: args.config.desiredCount,
    launchType: "FARGATE",
    taskDefinition: taskDefinition.arn,
    networkConfiguration: {
      subnets: args.privateSubnets.map((subnet) => subnet.id),
      securityGroups: [ecsSg.id],
      assignPublicIp: false,
    },
    loadBalancers: [
      {
        targetGroupArn: targetGroup.arn,
        containerName: args.config.prefix,
        containerPort: args.config.containerPort,
      },
    ],
    tags: {
      Name: `${args.config.prefix}-service`,
      Environment: args.config.environment,
    },
  });

  return {
    cluster,
    alb,
    service,
    taskDefinition,
    httpListener,
    httpsListener,
  };
}
