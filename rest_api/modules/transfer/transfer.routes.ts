import { Router } from 'express';
import {
  depositHandler,
  transferToHandler,
  spendHandler,
  getFundsHandler,
  getUserBalanceHandler,
  purchaseHandler,
} from './transfer.controller.ts';
import {
  depositSchema,
  transferToSchema,
  spendSchema,
  getFundsSchema,
  getUserBalanceSchema,
  purchaseSchema,
} from './transfer.schemas.ts';
import { validate } from '../../middleware.ts';

const router = Router();

// POST /transfers/{fundId}/deposit - Deposit tokens to transfer contract
router.post('/:fundId/deposit', validate(depositSchema), depositHandler);

// POST /transfers/{fundId}/transfer - Transfer tokens to targets
router.post('/:fundId/transfer', validate(transferToSchema), transferToHandler);

// POST /transfers/{fundId}/spend - Spend specific UTxOs to targets
router.post('/:fundId/spend', validate(spendSchema), spendHandler);

// GET /transfers/{fundId}/funds - Get transfer funds grouped by owner
router.get('/:fundId/funds', validate(getFundsSchema), getFundsHandler);

// GET /transfers/{fundId}/balance/{paymentCredentialHash} - Get user balance by payment credential hash
router.get('/:fundId/balance/:paymentCredentialHash', validate(getUserBalanceSchema), getUserBalanceHandler);

// POST /transfers/{fundId}/purchase - Purchase tokens (for whitelisted users)
router.post('/:fundId/purchase', validate(purchaseSchema), purchaseHandler);

export default router; 