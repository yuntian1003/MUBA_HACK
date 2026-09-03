const WALRUS_PUBLISHER =
  import.meta.env.VITE_WALRUS_PUBLISHER_URL ||
  'https://publisher.walrus-testnet.walrus.space';
const WALRUS_AGGREGATOR =
  import.meta.env.VITE_WALRUS_AGGREGATOR_URL ||
  'https://aggregator.walrus-testnet.walrus.space';

export interface WalrusUpload {
  blobId: string;
  url: string;
  name: string;
  size: number;
  type: string;
}

function getBlobId(payload: any): string | null {
  return payload?.newlyCreated?.blobObject?.blobId ?? payload?.alreadyCertified?.blobId ?? null;
}

export async function uploadToWalrus(file: File): Promise<WalrusUpload> {
  if (file.size === 0) throw new Error('The selected receipt is empty.');
  if (file.size > 10 * 1024 * 1024) throw new Error('Receipts must be smaller than 10 MB.');

  const response = await fetch(`${WALRUS_PUBLISHER}/v1/blobs`, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
  });

  if (!response.ok) throw new Error(`Walrus upload failed (${response.status}).`);

  const blobId = getBlobId(await response.json());
  if (!blobId) throw new Error('Walrus did not return a blob ID.');

  return {
    blobId,
    url: `${WALRUS_AGGREGATOR}/v1/blobs/${encodeURIComponent(blobId)}`,
    name: file.name,
    size: file.size,
    type: file.type,
  };
}