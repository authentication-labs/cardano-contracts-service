import { OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { registry } from "./registry.ts";
import * as yaml from 'yaml';
import * as fs from 'node:fs';

const config = {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'Cardano Funds Registry API',
    description: 'REST API for managing Cardano fund registries and whitelists',
    contact: {
      name: 'Digital Boss',
      url: 'https://github.com/digital-boss/cardano-funds',
    },
  },
  servers: [
    {
      url: 'http://localhost:3000',
      description: 'Development server',
    },
  ],
  tags: [
    {
      name: 'Health',
      description: 'Health check endpoints',
    },
    {
      name: 'Registry',
      description: 'Registry management endpoints',
    },
    {
      name: 'Whitelist',
      description: 'Whitelist management endpoints',
    },
  ],
};

export function getOpenApiDocumentation() {
  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument(config);
}

export function writeDocumentation(outputDir: string = './') {
  // OpenAPI JSON
  const docs = getOpenApiDocumentation();

  // Write JSON file
  // fs.writeFileSync(`${outputDir}/openapi-docs.json`, JSON.stringify(docs, null, 2), {
  //   encoding: 'utf-8',
  // });

  // Write YAML file
  const yamlContent = yaml.stringify(docs);
  fs.writeFileSync(`${outputDir}/openapi-docs.yml`, yamlContent, {
    encoding: 'utf-8',
  });

  console.log(`OpenAPI documentation generated at ${outputDir}.`);
}

