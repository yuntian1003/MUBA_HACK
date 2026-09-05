// src/hooks/usePayRequest.ts
import { useState } from 'react';
import { Transaction } from '@mysten/sui/transactions';
import { useCurrentAccount, useCurrentClient, useDAppKit, useWallets } from '@mysten/dapp-kit-react';
import { useQueryClient } from '@tanstack/react-query';
import { MIST_PER_SUI } from '../constants';
import { updatePaymentRequest } from '../api';
import type { PaymentRequest } from '../types';

export function usePayRequest() {
  const client = useCurrentClient();
  const walletAccount = useCurrentAccount();
  const wallets = useWallets();
  const dAppKit = useDAppKit();
  const queryClient = useQueryClient();

  const [isPaying, setIsPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [successDigest, setSuccessDigest] = useState<string | null>(null);

  async function pay(request: PaymentRequest): Promise<string | null> {
    if (!request.requesterAddress || !request.requesterAddress.startsWith('0x')) {
      setPayError('Invalid requester wallet address');
      return null;
    }

    if (request.amountSui <= 0) {
      setPayError('Invalid request amount');
      return null;
    }

    const mistAmount = BigInt(
      Math.max(1, Math.round(request.amountSui * Number(MIST_PER_SUI)))
    );

    setIsPaying(true);
    setPayError(null);
    setSuccessDigest(null);

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
      setPayError('No Sui Wallet extension found or connected. Please connect your Slush Wallet or Sui Wallet extension to pay.');
      setIsPaying(false);
      return null;
    }

    try {
      const tx = new Transaction();
      const [coin] = tx.splitCoins(tx.gas, [tx.pure.u64(mistAmount)]);
      tx.transferObjects([coin], tx.pure.address(request.requesterAddress.trim()));

      const txResult = await dAppKit.signAndExecuteTransaction({
        transaction: tx,
        account: activeAccount,
      });

      if ((txResult as any).$kind === 'FailedTransaction') {
        const failureMsg =
          (txResult as any).FailedTransaction?.status?.error?.message ||
          'Transaction rejected on-chain';
        throw new Error(failureMsg);
      }

      const digest =
        (txResult as any).digest || (txResult as any).Transaction?.digest || '';

      if (!digest) {
        throw new Error('Transaction submitted but no digest returned');
      }

      // Mark request as paid in backend
      await updatePaymentRequest(request.id, { status: 'paid', digest });

      // Wait for indexing
      try {
        if ((client as any).core?.waitForTransaction) {
          await (client as any).core.waitForTransaction({ digest });
        } else if (client.waitForTransaction) {
          await client.waitForTransaction({ digest });
        }
      } catch (waitErr) {
        console.warn('Indexer wait:', waitErr);
      }

      // Invalidate queries so lists update
      await queryClient.invalidateQueries({ queryKey: ['payment-requests'] });
      await queryClient.invalidateQueries({ queryKey: ['tx-history'] });

      setSuccessDigest(digest);
      return digest;
    } catch (err: any) {
      console.error('[usePayRequest] Error paying request:', err);
      let rawMsg = err instanceof Error ? err.message : String(err);
      if (/user rejected|rejected|denied|cancelled/i.test(rawMsg)) {
        rawMsg = 'Transaction cancelled in wallet.';
      } else if (/insufficient|gas balance/i.test(rawMsg)) {
        rawMsg = 'Insufficient SUI balance to pay this request and gas fees.';
      } else if (/password/i.test(rawMsg)) {
        rawMsg = 'Incorrect password in Slush Wallet. The transaction was rejected by your wallet.';
      }
      setPayError(rawMsg);
      return null;
    } finally {
      setIsPaying(false);
    }
  }

  function resetPay() {
    setIsPaying(false);
    setPayError(null);
    setSuccessDigest(null);
  }

  return { pay, isPaying, payError, successDigest, resetPay };
}

