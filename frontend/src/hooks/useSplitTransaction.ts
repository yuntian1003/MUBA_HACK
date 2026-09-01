// src/hooks/useSplitTransaction.ts
import { useState } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useCurrentClient, useDAppKit } from '@mysten/dapp-kit-react';
import { useQueryClient } from '@tanstack/react-query';
import type { Member } from '../types';
import { MIST_PER_SUI } from '../constants';

export interface RecipientShare {
  member: Member;
  amountSui: number;
}

export interface SplitParams {
  shares: RecipientShare[];
  purpose: string;
  direction?: 'pay' | 'receive';
}

export interface SplitResult {
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
    const { shares } = params;
    if (!shares || shares.length === 0) {
      setError('Select at least one recipient');
      return null;
    }

    const invalidShare = shares.find((s) => s.amountSui <= 0 || isNaN(s.amountSui));
    if (invalidShare) {
      setError(`Invalid amount for ${invalidShare.member.name}`);
      return null;
    }

    const mistAmounts = shares.map((s) =>
      BigInt(Math.max(1, Math.round(s.amountSui * Number(MIST_PER_SUI))))
    );

    const totalToSendMist = mistAmounts.reduce((a, b) => a + b, 0n);
    if (totalToSendMist <= 0n) {
      setError('Total split amount must be greater than 0');
      return null;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Build atomic PTB: split off individual amounts directly from gas coin
      const tx = new Transaction();

      // Split coin into distinct custom amounts for each recipient
      const splitCoins = tx.splitCoins(
        tx.gas,
        mistAmounts.map((amt) => tx.pure.u64(amt))
      );

      // Atomically transfer each allocated coin to its designated recipient
      for (let i = 0; i < shares.length; i++) {
        tx.transferObjects(
          [splitCoins[i]],
          tx.pure.address(shares[i].member.walletAddress)
        );
      }

      // Safety timeout race: prevent UI hanging if wallet extension popup is closed
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                'Wallet request timed out. Please unlock your wallet or check the popup.'
              )
            ),
          60_000
        );
      });

      const txResult = await Promise.race([
        signAndExecuteTransaction({ transaction: tx }),
        timeoutPromise,
      ]);

      if ((txResult as any).$kind === 'FailedTransaction') {
        const failureMsg =
          (txResult as any).FailedTransaction?.status?.error?.message ||
          'Transaction aborted on-chain';
        throw new Error(failureMsg);
      }

      // Extract digest directly from txResult
      const digest =
        (txResult as any).digest || (txResult as any).Transaction?.digest || '';

      if (!digest) {
        throw new Error('Transaction was submitted but no digest was returned.');
      }

      // Wait for indexer before invalidating queries
      if (digest) {
        try {
          if ((client as any).core?.waitForTransaction) {
            await (client as any).core.waitForTransaction({ digest });
          } else if (client.waitForTransaction) {
            await client.waitForTransaction({ digest });
          }
        } catch (indexerErr) {
          console.warn('Indexer wait warning:', indexerErr);
        }
      }
      await queryClient.invalidateQueries({ queryKey: ['tx-history'] });

      const splitResult: SplitResult = {
        digest,
        amounts: shares.map((s) => ({
          member: s.member,
          amountSui: s.amountSui,
        })),
      };
      setResult(splitResult);
      return splitResult;
    } catch (err: any) {
      let rawMsg = err instanceof Error ? err.message : String(err);
      if (
        rawMsg.includes('Rejected') ||
        rawMsg.includes('rejected') ||
        rawMsg.includes('denied') ||
        rawMsg.includes('User rejected')
      ) {
        rawMsg = 'Transaction cancelled in wallet.';
      } else if (
        rawMsg.includes('password') ||
        rawMsg.includes('locked') ||
        rawMsg.includes('lock')
      ) {
        rawMsg =
          'Wallet locked or incorrect password. Please unlock your wallet and try again.';
      } else if (
        rawMsg.includes('Insufficient') ||
        rawMsg.includes('insufficient')
      ) {
        rawMsg = 'Insufficient SUI balance for this split and gas fees.';
      }
      setError(rawMsg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }

  function reset() {
    setIsLoading(false);
    setError(null);
    setResult(null);
  }

  return { execute, isLoading, error, result, reset };
}
