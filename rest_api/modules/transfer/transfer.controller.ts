import { Request, Response } from 'express';
import { TransferService } from './transfer.service.ts';
import {
  DepositInput,
  TransferToInput,
  SpendInput,
  GetFundsInput,
  GetUserBalanceInput,
  PurchaseInput,
} from './transfer.schemas.ts';

export async function depositHandler(
  req: Request<DepositInput['params'], {}, DepositInput['body']>,
  res: Response
) {
  try {
    await TransferService.deposit(
      req.params.fundId,
      req.body.asset,
      req.body.account,
      req.body.targets,
    );
    res.status(201).json({ success: true });
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}

export async function transferToHandler(
  req: Request<TransferToInput['params'], {}, TransferToInput['body']>,
  res: Response
) {
  try {
    await TransferService.transferTo(
      req.params.fundId,
      req.body.asset,
      req.body.account,
      req.body.targets,
    );
    res.status(200).json({ success: true });
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}

export async function spendHandler(
  req: Request<SpendInput['params'], {}, SpendInput['body']>,
  res: Response
) {
  try {
    await TransferService.spend(
      req.params.fundId,
      req.body.asset,
      req.body.account,
      req.body.outrefs,
      req.body.targets,
    );
    res.status(200).json({ success: true });
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}

export async function getFundsHandler(
  req: Request<GetFundsInput>,
  res: Response
) {
  try {
    const result = await TransferService.getFunds(req.params.fundId);

    // Convert BigInt values to strings for JSON serialization
    const serializedResult = result.map(fund => ({
      owner: fund.owner,
      totalAssets: Object.fromEntries(
        Object.entries(fund.totalAssets).map(([unit, amount]) => [unit, amount.toString()])
      ),
      utxos: fund.utxos.map(utxo => ({
        outRef: utxo.outRef,
        assets: Object.fromEntries(
          Object.entries(utxo.assets).map(([unit, amount]) => [unit, amount.toString()])
        ),
      })),
    }));

    res.status(200).json(serializedResult);
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}

export async function getUserBalanceHandler(
  req: Request<GetUserBalanceInput>,
  res: Response
) {
  try {
    const result = await TransferService.getUserBalance(
      req.params.fundId,
      req.params.paymentCredentialHash,
    );

    if (result === null) {
      res.status(404).json({
        error: `No tokens found for payment credential hash ${req.params.paymentCredentialHash} in fund ${req.params.fundId}`
      });
      return;
    }

    res.status(200).json(result);
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
}

export async function purchaseHandler(
  req: Request<PurchaseInput['params'], {}, PurchaseInput['body']>,
  res: Response
) {
  try {
    await TransferService.purchase(
      req.params.fundId,
      req.body.asset,
      req.body.account,
      req.body.amount,
      req.body.paymentCredentialHash,
    );
    res.status(200).json({ success: true });
  } catch (e: any) {
    console.error(e.message);
    res.status(500).json({ error: e.message });
  }
} 