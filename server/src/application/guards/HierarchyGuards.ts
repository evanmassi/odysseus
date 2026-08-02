/**
 * Hierarchy Depth Guards
 *
 * Enforces the tier limit on nestable lab structures — the two-level category hierarchy every
 * catalog shares, and the three-tier location tree.
 */

import { NotFoundError } from '@domain/errors/NotFoundError';
import { ValidationError } from '@domain/errors/ValidationError';

interface NestableNode {
  readonly id: string;
  readonly parentId?: string;
}

interface NestableRepository {
  findByLabId(labId: string): Promise<NestableNode[]>;
}

interface DepthOptions {
  labId: string;
  parentId?: string | null;
  movingNodeId?: string;
  maxDepth?: number;
  label?: string;
}

/** Counts from 1 at the top; the size bound is a cycle backstop. */
function tierOf(node: NestableNode, byId: Map<string, NestableNode>): number {
  let tier = 1;
  let current = node;
  while (current.parentId) {
    const parent = byId.get(current.parentId);
    if (!parent || tier > byId.size) break;
    current = parent;
    tier += 1;
  }
  return tier;
}

/** Tiers spanned by a node and its deepest descendant; 1 for a leaf. */
function subtreeHeight(nodeId: string, byParent: Map<string, NestableNode[]>): number {
  const children = byParent.get(nodeId) ?? [];
  if (children.length === 0) return 1;
  return 1 + Math.max(...children.map(child => subtreeHeight(child.id, byParent)));
}

/** @throws ValidationError when the placement would exceed `maxDepth` tiers. */
export async function validateHierarchyDepth(
  repository: NestableRepository,
  { labId, parentId, movingNodeId, maxDepth = 2, label = 'category' }: DepthOptions
): Promise<void> {
  if (!parentId) return;

  const nodes = await repository.findByLabId(labId);
  const byId = new Map(nodes.map(node => [node.id, node]));

  const parent = byId.get(parentId);
  if (!parent) {
    throw new NotFoundError(`Parent ${label} not found`);
  }

  const byParent = new Map<string, NestableNode[]>();
  for (const node of nodes) {
    if (!node.parentId) continue;
    const siblings = byParent.get(node.parentId) ?? [];
    siblings.push(node);
    byParent.set(node.parentId, siblings);
  }

  const height = movingNodeId ? subtreeHeight(movingNodeId, byParent) : 1;

  if (tierOf(parent, byId) + height > maxDepth) {
    throw new ValidationError(
      height > 1
        ? `Cannot nest a ${label} that has its own children here — the hierarchy is ${maxDepth} levels deep`
        : `Cannot nest a ${label} that deep — the hierarchy is ${maxDepth} levels deep`
    );
  }
}
