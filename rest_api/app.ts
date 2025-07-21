import express from "express";
import swaggerUi from "swagger-ui-express";
import cors from "cors";
import registryRoutes from "./modules/registry/registry.routes.ts";
import transferRoutes from "./modules/transfer/transfer.routes.ts";
import { errorHandler } from "./middleware.ts";
import { getOpenApiDocumentation } from "./openapi/mod.ts";
import { type Express, Request, Response } from 'express'
import { checkEnvVars } from "../libs/env.ts";

function getEnvironmentReport() {
  const vars = [
    "BLOCKFROST_PROJECT_ID",
    "BLOCKFROST_URL",
    "LUCID_NETWORK",
    "DEFAULT_SCRIPTS_SRC",
    "CORS_ORIGINS",
  ]

  const varsReport = vars.map((v) => {
    const value = Deno.env.get(v);
    return `  ${v}: ${value ? value : "Not set"}`;
  }).join("\n");

  return varsReport
}

function getCorsOrigins(): string[] {
  const corsOrigins = Deno.env.get("CORS_ORIGINS");
  if (corsOrigins) {
    return corsOrigins.split(",").map(origin => origin.trim());
  }
  // Default fallback origins
  return ['http://localhost:3003', 'http://localhost:3000', 'http://localhost:3002', 'http://localhost:6001'];
}

const app: Express = express();

// Enable CORS for all routes
app.use(cors({
  origin: getCorsOrigins(),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

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
app.use("/transfers", transferRoutes);
const PORT = 3000;

const runningServer = app.listen(PORT, () => {
  console.log([
    `Server is running on http://localhost:${PORT}`,
    `OpenAPI documentation is available at http://localhost:${PORT}/openapi`,
    getEnvironmentReport(),
  ].join("\n"));
});

// runningServer.setTimeout(5 * 60 * 1000);
