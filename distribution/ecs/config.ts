/**
 * ECS Configuration
 *
 * This module provides the configuration for the ECS deployment.
 * It uses type-safe validation for the ECR repository name and
 * provides default values for various ECS settings.
 */

import { Config } from "@pulumi/pulumi";
import { validateEcrRepositoryName, EcrRepositoryName } from "./types";

const config = new Config();

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
  ecrRepositoryName: EcrRepositoryName;
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
  ecrRepositoryName: validateEcrRepositoryName(
    `${config.get("aws:accountId")}.dkr.ecr.${
      config.get("aws:region") || "us-east-1"
    }.amazonaws.com/queso`
  ),
};
