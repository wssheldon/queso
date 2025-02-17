import { appConfig } from "./config";
import { createVpc } from "./vpc";
import { createEcsCluster } from "./ecs";
import { EcrRepository } from "./ecr";
import { DockerBuilder } from "./docker";
import { createRdsCluster } from "./rds";

// Create VPC and networking infrastructure
const { vpc, publicSubnets, privateSubnets } = createVpc(appConfig);

// Create ECR repository
const ecrRepo = new EcrRepository("queso", {
  repositoryName: appConfig.ecrRepositoryName,
});

// Create RDS Aurora cluster
const database = createRdsCluster({
  config: appConfig,
  vpc,
  privateSubnets,
});

// Build and push Docker image
const dockerImage = new DockerBuilder("queso", {
  context: process.cwd() + "/../../", // Absolute path to project root
  dockerfile: process.cwd() + "/../../Dockerfile", // Absolute path to Dockerfile
  ecrRepository: ecrRepo,
  imageName: "queso",
  tags: [appConfig.environment],
});

// Create ECS Cluster and related resources
const { cluster, alb, service } = createEcsCluster({
  config: appConfig,
  vpc,
  publicSubnets,
  privateSubnets,
  ecrRepository: ecrRepo,
  dockerImage,
  databaseUrl: database.connectionString,
  databaseSecurityGroup: database.securityGroup,
});

// Export important values
export const vpcId = vpc.id;
export const clusterName = cluster.name;
export const repositoryUrl = ecrRepo.repository.repositoryUrl;
export const loadBalancerDns = alb.dnsName;
export const serviceName = service.name;
export const databaseEndpoint = database.cluster.endpoint;
