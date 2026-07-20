/**
 * Bulk Operation Executor
 *
 * Runs an operation per item sequentially, collecting successes and mapped
 * failures so one failing item never aborts the batch.
 */

export async function executeBulk<TItem, TSuccess, TFailure>(
  items: TItem[],
  operation: (item: TItem, index: number) => Promise<TSuccess>,
  onFailure: (item: TItem, index: number, error: string) => TFailure
): Promise<{ succeeded: TSuccess[]; failed: TFailure[] }> {
  const succeeded: TSuccess[] = [];
  const failed: TFailure[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      succeeded.push(await operation(items[i], i));
    } catch (error) {
      failed.push(onFailure(items[i], i, error instanceof Error ? error.message : 'Unknown error'));
    }
  }

  return { succeeded, failed };
}
