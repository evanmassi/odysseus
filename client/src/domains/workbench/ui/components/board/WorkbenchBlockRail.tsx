import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { BLOCK_TYPES } from '../../../utils/blocks/blockTypes';
import { createBlock } from '../../../utils/blocks/createBlock';

import { BLOCK_ICONS } from './blockIcons';
import { BLOCK_PANELS } from './blockPanels';

import type { ProtocolBlockType } from '@odysseus/shared-schemas';

const RAIL_GROUPS: ReadonlyArray<[string, ProtocolBlockType[]]> = [
  ['Inputs', ['materials']],
  ['Write', ['text', 'steps', 'flow', 'sketch']],
  ['Numbers', ['values', 'formula', 'dilutions', 'list']],
  ['Layout', ['plate']],
];

export function WorkbenchBlockRail() {
  const activePageId = useWorkbenchStore(state => state.activePageId);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);

  const addBlock = (type: ProtocolBlockType) =>
    updateProtocol(draft => {
      const [w, h] = BLOCK_TYPES[type].size;
      const bottom = Math.max(
        0,
        ...draft.blocks.filter(block => block.page === activePageId).map(block => block.y + block.h)
      );
      draft.blocks.push(createBlock(type, { page: activePageId, x: 0, y: bottom, w, h }));
    });

  const groups = RAIL_GROUPS.map(
    ([label, types]) => [label, types.filter(type => BLOCK_PANELS[type])] as const
  ).filter(([, types]) => types.length);

  return (
    <nav aria-label="Add a block" className="flex flex-col gap-4">
      {groups.map(([label, types]) => (
        <section key={label}>
          <h4 className="px-2 pb-1 type-label text-label-xs text-muted-foreground">{label}</h4>
          {types.map(type => {
            const Icon = BLOCK_ICONS[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => addBlock(type)}
                className="flex w-full items-start gap-2.5 px-2 py-1.5 text-left transition-colors hover:bg-foreground/[0.04]"
              >
                <Icon aria-hidden className="mt-0.5 h-4 w-4 flex-none text-primary" />
                <span className="min-w-0">
                  <span className="block text-body-sm text-foreground">
                    {BLOCK_TYPES[type].label}
                  </span>
                  <span className="block text-label-xs text-muted-foreground">
                    {BLOCK_TYPES[type].hint}
                  </span>
                </span>
              </button>
            );
          })}
        </section>
      ))}
    </nav>
  );
}
