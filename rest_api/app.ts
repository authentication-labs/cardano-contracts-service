import express from "express";
import swaggerUi from "swagger-ui-express";
import registryRoutes from "./modules/registry/registry.routes.ts";
import { errorHandler } from "./middleware.ts";
import { getOpenApiDocumentation } from "./openapi/mod.ts";
import {type Express, Request, Response } from 'express'
import { checkEnvVars } from "../libs/env.ts";

function getEnvironmentReport() {
  const vars = [
    "BLOCKFROST_PROJECT_ID",
    "BLOCKFROST_URL",
    "LUCID_NETWORK",
    "DEFAULT_SCRIPTS_SRC",
  ]

  const varsReport = vars.map((v) => {
    const value = Deno.env.get(v);
    return `  ${v}: ${value ? value : "Not set"}`;
  }).join("\n");

  return varsReport
}

const app: Express = express();

app.use(express.json());
app.use(errorHandler);

// Generate OpenAPI documentation
const openApiDocument = getOpenApiDocumentation();

// Setup Swagger UI
app.use("/openapi", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.get("/healthcheck", (_req: Request, res: Response) => {
  res.send({
    message: "API is up and running!",
  });
});

app.use("/registries", registryRoutes);
const PORT = 3000;

const runningServer = app.listen(PORT, () => {
  console.log([
    `Server is running on http://localhost:${PORT}`,
    `OpenAPI documentation is available at http://localhost:${PORT}/openapi`,
    getEnvironmentReport(),
  ].join("\n"));
});

// runningServer.setTimeout(5 * 60 * 1000);
