import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface EcrConfig {
  repositoryName: pulumi.Input<string>;
}

export class EcrRepository extends pulumi.ComponentResource {
  public readonly repository: aws.ecr.Repository;
  public readonly lifecyclePolicy: aws.ecr.LifecyclePolicy;

  constructor(
    name: string,
    config: EcrConfig,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("queso:ecr:Repository", name, {}, opts);

    // Create ECR repository
    this.repository = new aws.ecr.Repository(
      "queso-repository",
      {
        name: config.repositoryName,
        imageScanningConfiguration: {
          scanOnPush: true,
        },
        forceDelete: true,
      },
      { parent: this }
    );

    // Add lifecycle policy to only keep last 5 images
    this.lifecyclePolicy = new aws.ecr.LifecyclePolicy(
      "queso-lifecycle-policy",
      {
        repository: this.repository.name,
        policy: JSON.stringify({
          rules: [
            {
              rulePriority: 1,
              description: "Keep last 5 images",
              selection: {
                tagStatus: "any",
                countType: "imageCountMoreThan",
                countNumber: 5,
              },
              action: {
                type: "expire",
              },
            },
          ],
        }),
      },
      { parent: this }
    );

    this.registerOutputs();
  }
}
