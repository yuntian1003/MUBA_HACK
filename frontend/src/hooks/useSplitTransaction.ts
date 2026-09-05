import { useState } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useCurrentAccount, useCurrentClient, useDAppKit, useWallets } from '@mysten/dapp-kit-react';
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
  const walletAccount = useCurrentAccount();
  const wallets = useWallets();
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SplitResult | null>(null);

  async function execute(params: SplitParams): Promise<SplitResult | null> {
    let activeAccount = walletAccount;

    // Auto-connect browser wallet extension (Slush Wallet / Sui Wallet) if installed and not connected yet
    if (!activeAccount && wallets && wallets.length > 0) {
      try {
        const connResult = await dAppKit.connectWallet({ wallet: wallets[0] });
        if (connResult?.accounts && connResult.accounts.length > 0) {
          activeAccount = connResult.accounts[0];
        }
      } catch (connErr) {
        console.warn('Auto-connect wallet error:', connErr);
      }
    }

    if (!activeAccount) {
      setError('No Sui Wallet connected. Please connect your Slush Wallet or Sui Wallet extension to sign & execute SUI payments on Testnet.');
      return null;
    }

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
      // Validate recipient addresses
      for (const share of shares) {
        const addr = share.member.walletAddress?.trim();
        if (!addr || !addr.startsWith('0x') || addr.length < 10) {
          setError(`Invalid Sui wallet address for recipient ${share.member.name}`);
          return null;
        }
      }

      // Build atomic PTB: split off individual amounts directly from gas coin
      const tx = new Transaction();

      // Split coin into distinct custom amounts for each recipient
      const splitCoins = tx.splitCoins(
        tx.gas,
        mistAmounts.map((amt) => tx.pure.u64(amt))
      );

      // Atomically transfer each allocated coin to its designated recipient
      for (let i = 0; i < shares.length; i++) {
        const targetAddress = shares[i].member.walletAddress.trim();
        tx.transferObjects(
          [splitCoins[i]],
          tx.pure.address(targetAddress)
        );
      }

      // Safety timeout race: prevent UI hanging if wallet extension popup is closed
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () =>
            reject(
              new Error(
                'Wallet request timed out. Please check your wallet extension popup.'
              )
            ),
          75_000
        );
      });

      const txResult = await Promise.race([
        dAppKit.signAndExecuteTransaction({
          transaction: tx,
          account: activeAccount,
        }),
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
      console.error('[SmartSplit] Transaction execution error:', err);
      let rawMsg = err instanceof Error ? err.message : String(err);

      if (
        /user rejected/i.test(rawMsg) ||
        /rejected/i.test(rawMsg) ||
        /denied/i.test(rawMsg) ||
        /cancelled/i.test(rawMsg)
      ) {
        rawMsg = 'Transaction cancelled in wallet.';
      } else if (
        /insufficient/i.test(rawMsg) ||
        /gas balance/i.test(rawMsg) ||
        /cannot find gas coin/i.test(rawMsg)
      ) {
        rawMsg = 'Insufficient SUI balance for this payment and gas fee. Please request Testnet SUI from faucet.';
      } else if (
        /password/i.test(rawMsg)
      ) {
        rawMsg = 'Incorrect password in Slush Wallet. The transaction was rejected by your wallet.';
      } else if (
        /wallet is locked/i.test(rawMsg) ||
        /wallet locked/i.test(rawMsg)
      ) {
        rawMsg = 'Wallet is locked. Please unlock your wallet extension and try again.';
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
