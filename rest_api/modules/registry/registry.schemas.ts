import { z } from 'zod';

// Schema for creating a new registry (based on deploy all command)
export const createRegistrySchema = z.object({
  body: z.object({
    fundId: z.string({ required_error: 'Fund ID is required' }),
    adminAddr: z.string({ required_error: 'Admin address is required' }),
  }),
});

// Schema for registry params (fundId)
export const registryParamsSchema = z.object({
  params: z.object({
    fundId: z.string({ required_error: 'Fund ID is required' }),
  }),
});

// Schema for whitelist params (fundId + address)
export const removeFromWhitelistSchema = z.object({
  params: z.object({
    fundId: z.string({ required_error: 'Fund ID is required' }),
    address: z.string({ required_error: 'Address is required' }),
  }),
});

// Schema for adding address to whitelist (based on registry add command)
export const addToWhitelistSchema = z.object({
  params: z.object({
    fundId: z.string({ required_error: 'Fund ID is required' }),
  }),
  body: z.object({
    addresses: z.array(z.string()).min(1, 'At least one address is required')
  }),
});


// Inferred types
export type CreateRegistryInput = z.infer<typeof createRegistrySchema.shape.body>;
export type RegistryParamsInput = z.infer<typeof registryParamsSchema.shape.params>;
export type RemoveFromWhitelistInput = z.infer<typeof removeFromWhitelistSchema.shape.params>;
export type AddToWhitelistInput = z.infer<typeof addToWhitelistSchema>;
