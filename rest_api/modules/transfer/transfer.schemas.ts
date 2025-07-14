import { z } from 'zod';

// Schema for transfer operations params (fundId)
export const transferParamsSchema = z.object({
  params: z.object({
    fundId: z.string({ required_error: 'Fund ID is required' }),
  }),
});

// Schema for deposit operation
export const depositSchema = z.object({
  params: z.object({
    fundId: z.string({ required_error: 'Fund ID is required' }),
  }),
  body: z.object({
    asset: z.string({ required_error: 'Asset is required' }).describe('Asset in policyId:assetNameTxt format'),
    account: z.string({ required_error: 'Account is required' }).describe('Account alias or bech32 address'),
    targets: z.array(z.string()).min(1, 'At least one target is required').describe('Targets in format "credsHash:amount"'),
  }),
});

// Schema for transfer to operation
export const transferToSchema = z.object({
  params: z.object({
    fundId: z.string({ required_error: 'Fund ID is required' }),
  }),
  body: z.object({
    asset: z.string({ required_error: 'Asset is required' }).describe('Asset in policyId:assetNameTxt format'),
    account: z.string({ required_error: 'Account is required' }).describe('Account alias or bech32 address'),
    targets: z.array(z.string()).min(1, 'At least one target is required').describe('Targets in format "credsHash:amount"'),
  }),
});

// Schema for spend operation
export const spendSchema = z.object({
  params: z.object({
    fundId: z.string({ required_error: 'Fund ID is required' }),
  }),
  body: z.object({
    asset: z.string({ required_error: 'Asset is required' }).describe('Asset in policyId:assetNameTxt format'),
    account: z.string({ required_error: 'Account is required' }).describe('Account alias or bech32 address'),
    outrefs: z.string({ required_error: 'Output references are required' }).describe('Output references to spend (comma-separated)'),
    targets: z.array(z.string()).min(1, 'At least one target is required').describe('Targets in format "credsHash:amount"'),
  }),
});

// Schema for getting transfer funds
export const getFundsSchema = z.object({
  params: z.object({
    fundId: z.string({ required_error: 'Fund ID is required' }),
  }),
});

// Schema for purchase operation
export const purchaseSchema = z.object({
  params: z.object({
    fundId: z.string({ required_error: 'Fund ID is required' }),
  }),
  body: z.object({
    asset: z.string({ required_error: 'Asset is required' }).describe('Asset in policyId:assetNameTxt format'),
    account: z.string({ required_error: 'Account is required' }).describe('Account alias or bech32 address'),
    amount: z.string({ required_error: 'Amount is required' }).describe('Amount of tokens to purchase'),
    paymentCredentialHash: z.string({ required_error: 'Payment credential hash is required' }).describe('Payment credential hash of the buyer'),
  }),
});

// Inferred types
export type TransferParamsInput = z.infer<typeof transferParamsSchema.shape.params>;
export type DepositInput = z.infer<typeof depositSchema>;
export type TransferToInput = z.infer<typeof transferToSchema>;
export type SpendInput = z.infer<typeof spendSchema>;
export type GetFundsInput = z.infer<typeof getFundsSchema.shape.params>;
export type PurchaseInput = z.infer<typeof purchaseSchema>; 