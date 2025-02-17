import * as docker from "@pulumi/docker";
import * as pulumi from "@pulumi/pulumi";
import { EcrRepository } from "./ecr";

export interface DockerBuilderConfig {
  context: string;
  dockerfile: string;
  ecrRepository: EcrRepository;
  imageName: string;
  tags?: string[];
}

export class DockerBuilder extends pulumi.ComponentResource {
  public readonly image: docker.Image;
  public readonly imageUri: pulumi.Output<string>;

  constructor(
    name: string,
    config: DockerBuilderConfig,
    opts?: pulumi.ComponentResourceOptions
  ) {
    super("queso:docker:Builder", name, {}, opts);

    const registryInfo = config.ecrRepository.repository.registryId.apply(
      (registryId) => ({
        server: `${registryId}.dkr.ecr.us-east-1.amazonaws.com`,
      })
    );

    // Build and push the Docker image
    this.image = new docker.Image(
      config.imageName,
      {
        build: {
          context: config.context,
          dockerfile: config.dockerfile,
          platform: "linux/amd64",
        },
        imageName: pulumi.interpolate`${
          config.ecrRepository.repository.repositoryUrl
        }:${config.tags?.[0] || "latest"}`,
        registry: registryInfo,
      },
      { parent: this }
    );

    // Export the full URI of the image
    this.imageUri = this.image.imageName;

    this.registerOutputs();
  }
}
