import { appConfig } from "./config";
import { createVpc } from "./vpc";
import { createEcsCluster } from "./ecs";

// Create VPC and networking infrastructure
const { vpc, publicSubnets, privateSubnets } = createVpc(appConfig);

// Create ECS Cluster and related resources
const { cluster, repository, alb, service } = createEcsCluster(
  appConfig,
  vpc,
  publicSubnets,
  privateSubnets
);

// Export important values
export const vpcId = vpc.id;
export const clusterName = cluster.name;
export const repositoryUrl = repository.repositoryUrl;
export const loadBalancerDns = alb.dnsName;
export const serviceName = service.name;
