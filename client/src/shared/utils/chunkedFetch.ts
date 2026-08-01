/**
 * Chunked Bulk Fetch
 *
 * Splits an id list across several requests, since the bulk endpoints cap a request at 100 ids,
 * and runs a bounded number of them at once.
 */

const CHUNK_SIZE = 100;
const MAX_CONCURRENCY = 5;

/** Dedupes `ids`, fetches them in capped chunks, and concatenates the results in request order. */
export async function fetchInChunks<TResult>(
  ids: string[],
  fetchChunk: (chunk: string[]) => Promise<TResult[]>
): Promise<TResult[]> {
  const uniqueIds = Array.from(new Set(ids));
  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += CHUNK_SIZE) {
    chunks.push(uniqueIds.slice(i, i + CHUNK_SIZE));
  }

  const results: TResult[] = [];
  for (let i = 0; i < chunks.length; i += MAX_CONCURRENCY) {
    const batch = chunks.slice(i, i + MAX_CONCURRENCY);
    const responses = await Promise.all(batch.map(fetchChunk));
    for (const response of responses) results.push(...response);
  }
  return results;
}
