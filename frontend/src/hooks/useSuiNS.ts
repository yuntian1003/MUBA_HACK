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
export function useSuiNSName(address?: string, fallbackAddress?: string) {
  const client = useCurrentClient();

  return useQuery({
    queryKey: ['suins-reverse-name', address, fallbackAddress],
    queryFn: async () => {
      const addressesToTry = [address, fallbackAddress].filter(
        (a): a is string => !!a && a.startsWith('0x')
      );
      if (addressesToTry.length === 0) return null;

      for (const addr of addressesToTry) {
        // 1. Try resolveNameServiceNames (returns array of registered domains for address)
        try {
          const res = await (client as any).resolveNameServiceNames({ address: addr });
          if (res?.data && res.data.length > 0) {
            const domain = res.data[0];
            return domain.endsWith('.sui') ? domain : `${domain}.sui`;
          }
        } catch (err) {
          // Fall through
        }

        // 2. Try defaultNameServiceName
        try {
          const res = await (client as any).defaultNameServiceName({ address: addr });
          if (res?.data?.name) {
            const domain = res.data.name;
            return domain.endsWith('.sui') ? domain : `${domain}.sui`;
          }
        } catch (err) {
          // Fall through
        }
      }

      return null;
    },
    enabled: (!!address && address.startsWith('0x')) || (!!fallbackAddress && fallbackAddress.startsWith('0x')),
    staleTime: 60_000,
  });
}
