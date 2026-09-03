// src/hooks/useSuiNS.ts
import { useQuery } from '@tanstack/react-query';
import { useCurrentClient } from '@mysten/dapp-kit-react';

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
        const result = await client.resolveNameServiceAddress({ name: domainName });
        return result.address;
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
        const result = await client.defaultNameServiceName({ address });
        return result.data.name;
      } catch (err) {
        console.warn(`[SuiNS] Failed reverse lookup for ${address}:`, err);
        return null;
      }
    },
    enabled: !!address && address.startsWith('0x'),
    staleTime: 120_000,
  });
}
