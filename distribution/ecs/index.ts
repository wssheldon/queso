import { appConfig } from "./config";
import { createVpc } from "./vpc";
import { createEcsCluster } from "./ecs";
import { EcrRepository } from "./ecr";
import { DockerBuilder } from "./docker";
import { createRdsCluster } from "./rds";
import { createCertificate, createAlbDnsRecord } from "./dns";
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

// Create certificate and get hosted zone
const dnsSetup = pulumi
  .all([
    createCertificate({
      domainName: appConfig.domainName,
      environment: appConfig.environment,
      region: appConfig.region,
    }),
  ])
  .apply(([certResult]) => certResult);

// Create ECS Cluster with all components
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
    secrets,
    certificateArn: dnsSetup.certificate,
  }
);

// Create DNS record for ALB after cluster is created
const albDns = pulumi.all([alb, dnsSetup]).apply(([loadBalancer, certResult]) =>
  createAlbDnsRecord(
    {
      domainName: appConfig.domainName,
      environment: appConfig.environment,
      alb: loadBalancer,
    },
    certResult.hostedZone
  )
);

// Export important values
export const vpcId = vpc.id;
export const repositoryUrl = ecrRepo.repository.repositoryUrl;
export const loadBalancerDns = alb.dnsName;
export const domainName = appConfig.domainName;
export const certificateArn = dnsSetup.certificate;
