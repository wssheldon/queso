import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { AppConfig } from "./config";

export function createEcsCluster(
  config: AppConfig,
  vpc: aws.ec2.Vpc,
  publicSubnets: aws.ec2.Subnet[],
  privateSubnets: aws.ec2.Subnet[]
) {
  // Create ECS Cluster
  const cluster = new aws.ecs.Cluster(`${config.prefix}-cluster`, {
    tags: {
      Name: `${config.prefix}-cluster`,
      Environment: config.environment,
    },
  });

  // Create ECR Repository
  const repository = new aws.ecr.Repository(`${config.prefix}-repo`, {
    name: config.ecrRepositoryName,
    imageScanningConfiguration: {
      scanOnPush: true,
    },
    tags: {
      Name: `${config.prefix}-repo`,
      Environment: config.environment,
    },
  });

  // Create ALB Security Group
  const albSg = new aws.ec2.SecurityGroup(`${config.prefix}-alb-sg`, {
    vpcId: vpc.id,
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
      Name: `${config.prefix}-alb-sg`,
      Environment: config.environment,
    },
  });

  // Create ECS Security Group
  const ecsSg = new aws.ec2.SecurityGroup(`${config.prefix}-ecs-sg`, {
    vpcId: vpc.id,
    description: "Security group for ECS tasks",
    ingress: [
      {
        protocol: "tcp",
        fromPort: config.containerPort,
        toPort: config.containerPort,
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
      Name: `${config.prefix}-ecs-sg`,
      Environment: config.environment,
    },
  });

  // Create ALB
  const alb = new aws.lb.LoadBalancer(`${config.prefix}-alb`, {
    internal: false,
    loadBalancerType: "application",
    securityGroups: [albSg.id],
    subnets: publicSubnets.map((subnet) => subnet.id),
    tags: {
      Name: `${config.prefix}-alb`,
      Environment: config.environment,
    },
  });

  // Create Target Group
  const targetGroup = new aws.lb.TargetGroup(`${config.prefix}-tg`, {
    port: config.containerPort,
    protocol: "HTTP",
    targetType: "ip",
    vpcId: vpc.id,
    healthCheck: {
      enabled: true,
      path: config.healthCheckPath,
      port: config.containerPort.toString(),
      protocol: "HTTP",
      healthyThreshold: 3,
      unhealthyThreshold: 3,
      timeout: 5,
      interval: 30,
    },
    tags: {
      Name: `${config.prefix}-tg`,
      Environment: config.environment,
    },
  });

  // Create ALB Listener
  const listener = new aws.lb.Listener(`${config.prefix}-listener`, {
    loadBalancerArn: alb.arn,
    port: 80,
    protocol: "HTTP",
    defaultActions: [
      {
        type: "forward",
        targetGroupArn: targetGroup.arn,
      },
    ],
  });

  // Create ECS Task Execution Role
  const taskExecutionRole = new aws.iam.Role(
    `${config.prefix}-task-execution-role`,
    {
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
    }
  );

  // Attach policy to Task Execution Role
  new aws.iam.RolePolicyAttachment(`${config.prefix}-task-execution-policy`, {
    role: taskExecutionRole.name,
    policyArn:
      "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
  });

  // Create ECS Task Definition
  const taskDefinition = new aws.ecs.TaskDefinition(`${config.prefix}-task`, {
    family: config.prefix,
    cpu: config.cpu.toString(),
    memory: config.memory.toString(),
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: taskExecutionRole.arn,
    containerDefinitions: pulumi.jsonStringify([
      {
        name: config.prefix,
        image: repository.repositoryUrl,
        essential: true,
        portMappings: [
          {
            containerPort: config.containerPort,
            hostPort: config.containerPort,
            protocol: "tcp",
          },
        ],
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": `/ecs/${config.prefix}`,
            "awslogs-region": config.region,
            "awslogs-stream-prefix": "ecs",
          },
        },
      },
    ]),
  });

  // Create CloudWatch Log Group
  const logGroup = new aws.cloudwatch.LogGroup(`${config.prefix}-logs`, {
    name: `/ecs/${config.prefix}`,
    retentionInDays: 30,
    tags: {
      Name: `${config.prefix}-logs`,
      Environment: config.environment,
    },
  });

  // Create ECS Service
  const service = new aws.ecs.Service(`${config.prefix}-service`, {
    cluster: cluster.arn,
    desiredCount: config.desiredCount,
    launchType: "FARGATE",
    taskDefinition: taskDefinition.arn,
    networkConfiguration: {
      subnets: privateSubnets.map((subnet) => subnet.id),
      securityGroups: [ecsSg.id],
      assignPublicIp: false,
    },
    loadBalancers: [
      {
        targetGroupArn: targetGroup.arn,
        containerName: `${config.prefix}-container`,
        containerPort: config.containerPort,
      },
    ],
    tags: {
      Name: `${config.prefix}-service`,
      Environment: config.environment,
    },
  });

  return {
    cluster,
    repository,
    alb,
    service,
    taskDefinition,
  };
}
