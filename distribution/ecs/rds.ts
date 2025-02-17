import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { AppConfig } from "./config";

export interface RdsClusterArgs {
  config: AppConfig;
  vpc: aws.ec2.Vpc;
  privateSubnets: aws.ec2.Subnet[];
}

export function createRdsCluster(args: RdsClusterArgs) {
  // Create a security group for the RDS cluster
  const rdsSecurityGroup = new aws.ec2.SecurityGroup(
    `${args.config.prefix}-rds-sg`,
    {
      vpcId: args.vpc.id,
      description: "Security group for RDS Aurora cluster",
      egress: [
        {
          protocol: "-1",
          fromPort: 0,
          toPort: 0,
          cidrBlocks: ["0.0.0.0/0"],
        },
      ],
      tags: {
        Name: `${args.config.prefix}-rds-sg`,
        Environment: args.config.environment,
      },
    }
  );

  // Create security group rules after we have the CIDR blocks
  args.privateSubnets.forEach((subnet, index) => {
    subnet.cidrBlock.apply((cidr) => {
      if (cidr) {
        new aws.ec2.SecurityGroupRule(
          `${args.config.prefix}-rds-sg-rule-${index}`,
          {
            type: "ingress",
            fromPort: 5432,
            toPort: 5432,
            protocol: "tcp",
            cidrBlocks: [cidr],
            securityGroupId: rdsSecurityGroup.id,
          }
        );
      }
    });
  });

  // Create a subnet group for the RDS cluster
  const rdsSubnetGroup = new aws.rds.SubnetGroup(
    `${args.config.prefix}-rds-subnet-group`,
    {
      subnetIds: args.privateSubnets.map((subnet) => subnet.id),
      tags: {
        Name: `${args.config.prefix}-rds-subnet-group`,
        Environment: args.config.environment,
      },
    }
  );

  // Create the Aurora cluster
  const cluster = new aws.rds.Cluster(`${args.config.prefix}-aurora-cluster`, {
    engine: "aurora-postgresql",
    engineVersion: "16.1",
    engineMode: "provisioned",
    databaseName: "queso",
    masterUsername: "queso_admin",
    masterPassword: args.config.dbPassword,
    skipFinalSnapshot: args.config.environment !== "prod",
    backupRetentionPeriod: args.config.environment === "prod" ? 7 : 1,
    preferredBackupWindow: "07:00-09:00",
    dbSubnetGroupName: rdsSubnetGroup.name,
    vpcSecurityGroupIds: [rdsSecurityGroup.id],
    storageEncrypted: true,
    enabledCloudwatchLogsExports: ["postgresql"],
    applyImmediately: args.config.environment !== "prod",
    copyTagsToSnapshot: true,
    deletionProtection: args.config.environment === "prod",
    tags: {
      Name: `${args.config.prefix}-aurora-cluster`,
      Environment: args.config.environment,
    },
  });

  // Create cluster instances
  const instanceCount = args.config.environment === "prod" ? 2 : 1;
  const instances = Array.from({ length: instanceCount }).map((_, i) => {
    return new aws.rds.ClusterInstance(
      `${args.config.prefix}-aurora-instance-${i}`,
      {
        clusterIdentifier: cluster.id,
        instanceClass:
          args.config.environment === "prod" ? "db.r6g.large" : "db.t4g.medium",
        engine: "aurora-postgresql",
        engineVersion: cluster.engineVersion,
        dbSubnetGroupName: rdsSubnetGroup.name,
        performanceInsightsEnabled: true,
        performanceInsightsRetentionPeriod: 7,
        monitoringInterval: 60,
        autoMinorVersionUpgrade: true,
        tags: {
          Name: `${args.config.prefix}-aurora-instance-${i}`,
          Environment: args.config.environment,
        },
      }
    );
  });

  return {
    cluster,
    instances,
    securityGroup: rdsSecurityGroup,
    connectionString: pulumi.interpolate`postgres://${cluster.masterUsername}:${args.config.dbPassword}@${cluster.endpoint}:${cluster.port}/${cluster.databaseName}`,
  };
}
