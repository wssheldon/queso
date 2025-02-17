/**
 * ECS Configuration
 *
 * This module provides the configuration for the ECS deployment.
 * It uses type-safe validation for the ECR repository name and
 * provides default values for various ECS settings.
 */

import { Config, Output, output } from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import { validateEcrRepositoryName, EcrRepositoryName } from "./types";
import * as pulumi from "@pulumi/pulumi";

const config = new Config();
const caller = aws.getCallerIdentity({});

/**
 * Configuration interface for the ECS application.
 * Includes all necessary settings for deploying an ECS service.
 */
export interface AppConfig {
  /** The deployment environment (e.g., "dev", "prod") */
  environment: string;
  /** Prefix for resource naming */
  prefix: string;
  /** AWS region for deployment */
  region: string;
  /** CIDR block for the VPC */
  vpcCidr: string;
  /** CIDR blocks for public subnets */
  publicSubnetCidrs: string[];
  /** CIDR blocks for private subnets */
  privateSubnetCidrs: string[];
  /** Container port for the application */
  containerPort: number;
  /** Desired count of ECS tasks */
  desiredCount: number;
  /** CPU units for the ECS task */
  cpu: number;
  /** Memory (in MiB) for the ECS task */
  memory: number;
  /** Health check path for the application */
  healthCheckPath: string;
  /** Validated ECR repository name */
  ecrRepositoryName: Output<EcrRepositoryName>;
  /** Database password */
  dbPassword: Output<string>;
  /** JWT secret for authentication */
  jwtSecret: Output<string>;
  /** Google OAuth client ID */
  googleClientId: Output<string>;
  /** Google OAuth client secret */
  googleClientSecret: Output<string>;
  /** Domain name for the application */
  domainName: string;
}

export const appConfig: AppConfig = {
  environment: config.get("environment") || "dev",
  prefix: config.get("prefix") || "queso",
  region: config.get("region") || "us-east-1",
  vpcCidr: "10.0.0.0/16",
  publicSubnetCidrs: ["10.0.1.0/24", "10.0.2.0/24"],
  privateSubnetCidrs: ["10.0.3.0/24", "10.0.4.0/24"],
  containerPort: config.getNumber("containerPort") || 3000,
  desiredCount: config.getNumber("desiredCount") || 1,
  cpu: config.getNumber("cpu") || 256,
  memory: config.getNumber("memory") || 512,
  healthCheckPath: config.get("healthCheckPath") || "/health",
  ecrRepositoryName: output(caller).apply(
    (current) =>
      validateEcrRepositoryName(
        `${current.accountId}.dkr.ecr.${
          config.get("region") || "us-east-1"
        }.amazonaws.com/queso`
      ) as EcrRepositoryName
  ),
  dbPassword: config.requireSecret("dbPassword"),
  jwtSecret: config.requireSecret("jwtSecret"),
  googleClientId: config.requireSecret("googleClientId"),
  googleClientSecret: config.requireSecret("googleClientSecret"),
  domainName: config.require("domainName"),
};
