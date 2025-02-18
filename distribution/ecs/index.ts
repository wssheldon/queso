import { appConfig } from "./config";
import { createVpc } from "./vpc";
import { createEcsCluster } from "./ecs";
import { EcrRepository } from "./ecr";
import { DockerBuilder } from "./docker";
import { createRdsCluster } from "./rds";
import { configureDns } from "./dns";
import { createSecrets } from "./secrets";
import * as pulumi from "@pulumi/pulumi";

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

// Create secrets first
const secrets = createSecrets({
  config: appConfig,
  prefix: appConfig.prefix,
  environment: appConfig.environment,
});

// Create initial ECS Cluster to get ALB
const initialDeploy = createEcsCluster({
  config: appConfig,
  vpc,
  publicSubnets,
  privateSubnets,
  ecrRepository: ecrRepo,
  dockerImage,
  databaseUrl: database.connectionString,
  databaseSecurityGroup: database.securityGroup,
  secrets,
  stage: "initial",
});

// Configure DNS and SSL certificate
const dns = configureDns({
  domainName: appConfig.domainName,
  environment: appConfig.environment,
  alb: initialDeploy.alb,
  region: appConfig.region,
});

// Create final ECS Cluster with certificate
const { cluster, alb, service, httpListener, httpsListener } = createEcsCluster(
  {
    config: appConfig,
    vpc,
    publicSubnets,
    privateSubnets,
    ecrRepository: ecrRepo,
    dockerImage,
    databaseUrl: database.connectionString,
    databaseSecurityGroup: database.securityGroup,
    certificateArn: pulumi.output(dns).certificate,
    secrets,
    stage: "final",
  }
);

// Export important values
export const vpcId = vpc.id;
export const repositoryUrl = ecrRepo.repository.repositoryUrl;
export const loadBalancerDns = alb.dnsName;
export const domainName = appConfig.domainName;
export const certificateArn = pulumi.output(dns).certificate;
