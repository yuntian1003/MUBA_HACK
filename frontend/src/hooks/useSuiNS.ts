// src/hooks/useSuiNS.ts
import { useQuery } from '@tanstack/react-query';
import { useCurrentClient } from '@mysten/dapp-kit-react';
import { SuinsClient } from '@mysten/suins';

/**
 * Hook to resolve a .sui domain name to a Sui wallet address (e.g. "alice.sui" -> "0x1234...")
 */
export function useSuiNSAddress(domainOrAddress?: string) {
  const client = useCurrentClient();

  return useQuery({
    queryKey: ['suins-resolve-address', domainOrAddress],
    queryFn: async () => {
      if (!domainOrAddress) return null;
      const trimmed = domainOrAddress.trim().toLowerCase();

      // If it's already a valid 0x address, return it directly
      if (trimmed.startsWith('0x') && trimmed.length >= 40) {
        return trimmed;
      }

      // Format domain with .sui if omitted (e.g. "alice" -> "alice.sui")
      const domainName = trimmed.endsWith('.sui') ? trimmed : `${trimmed}.sui`;

      try {
        const suinsClient = new SuinsClient({
          client: client as any,
          network: 'testnet',
        });
        const record = await suinsClient.getNameRecord(domainName);
        return record?.targetAddress || null;
      } catch (err) {
        console.warn(`[SuiNS] Failed to resolve ${domainName}:`, err);
        return null;
      }
    },
    enabled: !!domainOrAddress && domainOrAddress.trim().length > 0,
    staleTime: 60_000,
  });
}

/**
 * Hook to reverse-resolve a Sui wallet address to its primary .sui domain name
 */
export function useSuiNSName(address?: string) {
  const client = useCurrentClient();

  return useQuery({
    queryKey: ['suins-reverse-name', address],
    queryFn: async () => {
      if (!address || !address.startsWith('0x')) return null;

      try {
        // Attempt reverse resolution if supported by client or RPC
        if ((client as any).resolveNameServiceNames) {
          const res = await (client as any).resolveNameServiceNames({ owner: address });
          return res?.data?.[0] || null;
        }
        return null;
      } catch (err) {
        console.warn(`[SuiNS] Failed reverse lookup for ${address}:`, err);
        return null;
      }
    },
    enabled: !!address && address.startsWith('0x'),
    staleTime: 120_000,
  });
}
