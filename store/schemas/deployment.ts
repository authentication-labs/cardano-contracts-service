import { z } from "zod";
import { AssetClassSchema, OutRefSchema, storeSchema } from "./common.ts";
import { Script } from "lucid"
import { createEnumSchema } from "../../libs/zod_helpers.ts";

export const Scripts = ['AdminToken', 'Registry', 'Transfer'] as const;

export type ScriptName = (typeof Scripts)[number];

const ScriptRefsSchema = createEnumSchema(Scripts, OutRefSchema);

export type ScriptRefs = z.infer<typeof ScriptRefsSchema>

export type ScriptsBag<T> = {
  [K in ScriptName]: T;
}

const ScriptSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('Native'),
    script: z.string(),
  }),
  z.object({
    type: z.literal('PlutusV1'),
    script: z.string(),
  }),
  z.object({
    type: z.literal('PlutusV2'),
    script: z.string(),
  }),
  z.object({
    type: z.literal('PlutusV3'),
    script: z.string(),
  }),
]);

export const DeploymentItemSchema = z.object({
  timestamp: z.string().transform((str: string) => new Date(str)),
  fundId: z.string(),
  description: z.string().optional(),
  // Parameters involved in operations
  params: z.object({
    // Depends on AdminToken policy
    adminToken: AssetClassSchema,
  }),
  scripts: createEnumSchema(Scripts, ScriptSchema),
  scriptRefs: ScriptRefsSchema,
  buildArgs: z.object({
    AdminToken: z.object({
      tokenName: z.string(),
      adminAddr: z.string(),
    }),
    Registry: z.object({
      admin_token: AssetClassSchema,
      adminAddr: z.string(),
    }),
    Transfer: z.object({
      admin_token: AssetClassSchema,
      registry_script_hash: z.string(),
    }),
  })
});
export type DeploymentItem = z.infer<typeof DeploymentItemSchema>;

export const DeploymentsStoreSchema = storeSchema(DeploymentItemSchema);
export type DeploymentsStore = z.infer<typeof DeploymentsStoreSchema>;
