// src/hooks/useSplitTransaction.ts
import { useState } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useCurrentClient } from '@mysten/dapp-kit-react';
import { useDAppKit } from '@mysten/dapp-kit-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Member } from '../types';
import { MIST_PER_SUI } from '../constants';

interface SplitParams {
  recipients: Member[];
  totalAmountSui: number;
  purpose: string;
  direction: 'pay' | 'receive';
}

interface SplitResult {
  digest: string;
  amounts: { member: Member; amountSui: number }[];
}

export function useSplitTransaction() {
  const client = useCurrentClient();
  const { signAndExecuteTransaction } = useDAppKit();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SplitResult | null>(null);

  async function execute(params: SplitParams): Promise<SplitResult | null> {
    const { recipients, totalAmountSui, purpose } = params;
    if (recipients.length === 0) {
      setError('Select at least one recipient');
      return null;
    }
    if (totalAmountSui <= 0) {
      setError('Total amount must be greater than 0');
      return null;
    }

    const perPersonSui = totalAmountSui / recipients.length;
    const perPersonMist = BigInt(Math.round(perPersonSui * Number(MIST_PER_SUI)));

    // Validate total (rounding guard)
    const totalMist = perPersonMist * BigInt(recipients.length);
    if (totalMist <= 0n) {
      setError('Split amounts too small');
      return null;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Build PTB: split gas coin → pass to smart contract
      const tx = new Transaction();

      // Split off the total amount from the gas coin
      const totalMist = perPersonMist * BigInt(recipients.length);
      const splitCoins = tx.splitCoins(tx.gas, [tx.pure.u64(totalMist)]);

      const addresses = recipients.map((m) => m.walletAddress);
      const packageId = import.meta.env.VITE_PACKAGE_ID;

      if (!packageId) {
        throw new Error("VITE_PACKAGE_ID is not configured in .env");
      }

      tx.moveCall({
        target: `${packageId}::smartsplit::execute_equal_split`,
        arguments: [
          splitCoins[0],
          tx.pure.vector('address', addresses),
          tx.pure.string(purpose || "SmartSplit"),
        ],
      });

      tx.setGasBudget(50_000_000); // 0.05 SUI

      const txResult = await signAndExecuteTransaction({ transaction: tx });

      // Extract digest directly from txResult
      const digest = (txResult as any).digest || (txResult as any).Transaction?.digest || '';
      
      if (!digest) {
        throw new Error('Transaction failed or digest not found');
      }

      // Wait for indexer before invalidating caches
      if (digest) {
        await client.waitForTransaction({ digest });
      }
      await queryClient.invalidateQueries({ queryKey: ['tx-history'] });

      const splitResult: SplitResult = {
        digest,
        amounts: recipients.map((m) => ({ member: m, amountSui: perPersonSui })),
      };
      setResult(splitResult);
      return splitResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setError(null);
    setResult(null);
  }

  return { execute, isLoading, error, result, reset };
}
