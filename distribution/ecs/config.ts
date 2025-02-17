import { Config } from "@pulumi/pulumi";

const config = new Config();

// Type to ensure string length is within AWS ECR limits
type MaxLength<T extends string, N extends number> = T extends {
  length: infer L;
}
  ? L extends N
    ? T
    : L extends number
    ? number extends L
      ? string
      : L extends N
      ? T
      : L extends Exclude<number, N>
      ? never
      : T
    : string
  : string;

// Type for ECR repository name (max 255 chars)
type EcrRepositoryName = MaxLength<string, 255>;

// Utility type to ensure a string is not too long
type ValidateStringLength<T extends string, N extends number> = T extends {
  length: infer L;
}
  ? L extends number
    ? L extends N
      ? T
      : number extends L
      ? string
      : L extends Exclude<number, N>
      ? L extends number
        ? L extends number & { readonly brand: unique symbol }
          ? T
          : L extends number
          ? L extends number & { readonly tooLong: true }
            ? never
            : T
          : never
        : never
      : T
    : string
  : string;

// Validate ECR repository name at compile time
const validateEcrRepositoryName = <T extends string>(
  name: T
): ValidateStringLength<T, 255> => {
  if (name.length > 255) {
    throw new Error("ECR repository name must be 255 characters or less");
  }
  return name as unknown as ValidateStringLength<T, 255>;
};

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
