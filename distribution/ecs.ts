export function createECSResources(config: Config, vpc: VPC) {
  // Create ECS Task Definition
  const taskDefinition = new aws.ecs.TaskDefinition("queso-task", {
    family: "queso",
    cpu: "256",
    memory: "512",
    networkMode: "awsvpc",
    requiresCompatibilities: ["FARGATE"],
    executionRoleArn: taskExecutionRole.arn,
    containerDefinitions: pulumi.jsonStringify([
      {
        name: "queso",
        image: `${config.ecrRepository}:latest`, // Using the ECR repository directly
        essential: true,
        portMappings: [
          {
            containerPort: 3000,
            hostPort: 3000,
            protocol: "tcp",
          },
        ],
        logConfiguration: {
          logDriver: "awslogs",
          options: {
            "awslogs-group": "/ecs/queso",
            "awslogs-region": config.region,
            "awslogs-stream-prefix": "ecs",
          },
        },
      },
    ]),
  });
}
