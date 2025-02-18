import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface DnsConfig {
  domainName: string;
  environment: string;
  region: string;
}

export interface AlbDnsConfig {
  domainName: string;
  environment: string;
  alb: aws.lb.LoadBalancer;
}

export async function createCertificate(config: DnsConfig) {
  // Get the hosted zone for the domain
  const hostedZone = await aws.route53.getZone({
    name: config.domainName,
    privateZone: false,
  });

  // Create ACM certificate
  const certificate = new aws.acm.Certificate(
    `${config.environment}-certificate`,
    {
      domainName: config.domainName,
      validationMethod: "DNS",
      subjectAlternativeNames: [`*.${config.domainName}`], // Include wildcard for subdomains
      tags: {
        Environment: config.environment,
      },
    }
  );

  // Create DNS records for certificate validation
  const certificateValidationDomain = new aws.route53.Record(
    `${config.environment}-certificate-validation`,
    {
      name: certificate.domainValidationOptions[0].resourceRecordName,
      type: certificate.domainValidationOptions[0].resourceRecordType,
      zoneId: hostedZone.zoneId,
      records: [certificate.domainValidationOptions[0].resourceRecordValue],
      ttl: 60,
    }
  );

  // Create certificate validation
  const certificateValidation = new aws.acm.CertificateValidation(
    `${config.environment}-certificate-validation`,
    {
      certificateArn: certificate.arn,
      validationRecordFqdns: [certificateValidationDomain.fqdn],
    }
  );

  return {
    certificate: certificateValidation.certificateArn,
    hostedZone,
  };
}

export async function createAlbDnsRecord(
  config: AlbDnsConfig,
  hostedZone: aws.route53.GetZoneResult
) {
  // Create A record for the domain pointing to ALB
  const albAliasRecord = new aws.route53.Record(
    `${config.environment}-alb-alias`,
    {
      name: config.domainName,
      type: "A",
      zoneId: hostedZone.zoneId,
      aliases: [
        {
          name: config.alb.dnsName,
          zoneId: config.alb.zoneId,
          evaluateTargetHealth: true,
        },
      ],
    }
  );

  return {
    albAliasRecord,
  };
}
