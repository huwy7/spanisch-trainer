import { createHash } from 'node:crypto';

/** Format of public/data/manifest.json (SPEC §6). */
export interface DataManifest {
  version: 1;
  generatedAt: string;
  /** Chunk path (relative to public/data/) → content hash. */
  chunks: Record<string, string>;
}

export function hashContent(content: string | Uint8Array): string {
  return createHash('sha256').update(content).digest('hex').slice(0, 16);
}

export function buildManifest(
  chunks: Record<string, string | Uint8Array>,
  generatedAt: Date = new Date(),
): DataManifest {
  const hashes: Record<string, string> = {};
  for (const path of Object.keys(chunks).sort()) {
    hashes[path] = hashContent(chunks[path]!);
  }
  return { version: 1, generatedAt: generatedAt.toISOString(), chunks: hashes };
}
