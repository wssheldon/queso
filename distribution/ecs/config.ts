import { Config } from "@pulumi/pulumi";

const config = new Config();

export interface AppConfig {
  environment: string;
  prefix: string;
  region: string;
  vpcCidr: string;
  publicSubnetCidrs: string[];
  privateSubnetCidrs: string[];
  containerPort: number;
  desiredCount: number;
  cpu: number;
  memory: number;
  healthCheckPath: string;
  ecrRepository: string;
}

export const appConfig: AppConfig = {
  environment: config.get("environment") || "dev",
  prefix: "queso",
  region: config.get("aws:region") || "us-east-1",
  vpcCidr: "10.0.0.0/16",
  publicSubnetCidrs: ["10.0.1.0/24", "10.0.2.0/24"],
  privateSubnetCidrs: ["10.0.3.0/24", "10.0.4.0/24"],
  containerPort: 3000,
  desiredCount: 2,
  cpu: 256,
  memory: 512,
  healthCheckPath: "/health",
  ecrRepository: `${config.get("aws:accountId")}.dkr.ecr.${
    config.get("aws:region") || "us-east-1"
  }.amazonaws.com/queso`,
};
