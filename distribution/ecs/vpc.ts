import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { AppConfig } from "./config";

export function createVpc(config: AppConfig) {
  // Create VPC
  const vpc = new aws.ec2.Vpc(`${config.prefix}-vpc`, {
    cidrBlock: config.vpcCidr,
    enableDnsHostnames: true,
    enableDnsSupport: true,
    tags: {
      Name: `${config.prefix}-vpc`,
      Environment: config.environment,
    },
  });

  // Create Internet Gateway
  const internetGateway = new aws.ec2.InternetGateway(`${config.prefix}-igw`, {
    vpcId: vpc.id,
    tags: {
      Name: `${config.prefix}-igw`,
      Environment: config.environment,
    },
  });

  // Create public subnets
  const publicSubnets = config.publicSubnetCidrs.map((cidr, index) => {
    return new aws.ec2.Subnet(`${config.prefix}-public-subnet-${index + 1}`, {
      vpcId: vpc.id,
      cidrBlock: cidr,
      availabilityZone: pulumi.output(aws.getAvailabilityZones()).names[index],
      mapPublicIpOnLaunch: true,
      tags: {
        Name: `${config.prefix}-public-subnet-${index + 1}`,
        Environment: config.environment,
      },
    });
  });

  // Create private subnets
  const privateSubnets = config.privateSubnetCidrs.map((cidr, index) => {
    return new aws.ec2.Subnet(`${config.prefix}-private-subnet-${index + 1}`, {
      vpcId: vpc.id,
      cidrBlock: cidr,
      availabilityZone: pulumi.output(aws.getAvailabilityZones()).names[index],
      tags: {
        Name: `${config.prefix}-private-subnet-${index + 1}`,
        Environment: config.environment,
      },
    });
  });

  // Create public route table
  const publicRouteTable = new aws.ec2.RouteTable(
    `${config.prefix}-public-rt`,
    {
      vpcId: vpc.id,
      routes: [
        {
          cidrBlock: "0.0.0.0/0",
          gatewayId: internetGateway.id,
        },
      ],
      tags: {
        Name: `${config.prefix}-public-rt`,
        Environment: config.environment,
      },
    }
  );

  // Associate public subnets with public route table
  publicSubnets.forEach((subnet, index) => {
    new aws.ec2.RouteTableAssociation(
      `${config.prefix}-public-rta-${index + 1}`,
      {
        subnetId: subnet.id,
        routeTableId: publicRouteTable.id,
      }
    );
  });

  // Create NAT Gateway for private subnets
  const eip = new aws.ec2.Eip(`${config.prefix}-eip`, {
    domain: "vpc",
    tags: {
      Name: `${config.prefix}-eip`,
      Environment: config.environment,
    },
  });

  const natGateway = new aws.ec2.NatGateway(`${config.prefix}-nat`, {
    allocationId: eip.id,
    subnetId: publicSubnets[0].id,
    tags: {
      Name: `${config.prefix}-nat`,
      Environment: config.environment,
    },
  });

  // Create private route table
  const privateRouteTable = new aws.ec2.RouteTable(
    `${config.prefix}-private-rt`,
    {
      vpcId: vpc.id,
      routes: [
        {
          cidrBlock: "0.0.0.0/0",
          natGatewayId: natGateway.id,
        },
      ],
      tags: {
        Name: `${config.prefix}-private-rt`,
        Environment: config.environment,
      },
    }
  );

  // Associate private subnets with private route table
  privateSubnets.forEach((subnet, index) => {
    new aws.ec2.RouteTableAssociation(
      `${config.prefix}-private-rta-${index + 1}`,
      {
        subnetId: subnet.id,
        routeTableId: privateRouteTable.id,
      }
    );
  });

  return {
    vpc,
    publicSubnets,
    privateSubnets,
  };
}
