import { useId, useState } from 'react';

import { Palette } from 'lucide-react';

import { Button, Checkbox, Input } from '@shared/ui';
import { BaseModal } from '@shared/ui/components/overlays/BaseModal';

import { useDyeAddStore } from '../../../stores/dyeAddStore';
import { useWorkbenchStore } from '../../../stores/workbenchStore';
import { focusOnMount } from '../../../utils/dom/focusOnMount';
import { STANDARD_LASERS_NM, laserLabel } from '../../../utils/dyes/dyeCatalog';
import { keepDyeInFile } from '../../../utils/dyes/fileDyes';

import type { ProtocolDye } from '@odysseus/shared-schemas';

interface DyeAddFormProps {
  typedName: string;
  onAdd: (dye: ProtocolDye) => void;
  onCancel: () => void;
}

const LOWEST_PEAK_NM = 300;
const HIGHEST_PEAK_NM = 1000;
const LABEL = 'type-label text-label-2xs font-semibold text-muted-foreground';

export function WorkbenchDyeAddDialog() {
  const request = useDyeAddStore(state => state.request);
  const close = useDyeAddStore(state => state.close);
  const updateProtocol = useWorkbenchStore(state => state.updateProtocol);
  if (!request) return null;
  const add = (dye: ProtocolDye) => {
    updateProtocol(draft => keepDyeInFile(draft, dye));
    request.onAdded(dye.name);
    close();
  };
  return <DyeAddForm key={request.id} typedName={request.typedName} onAdd={add} onCancel={close} />;
}

function DyeAddForm({ typedName, onAdd, onCancel }: DyeAddFormProps) {
  const nameId = useId();
  const peakId = useId();
  const [name, setName] = useState(typedName.trim());
  const [lasers, setLasers] = useState<number[]>([]);
  const [peakText, setPeakText] = useState('');
  const peak = Number.parseFloat(peakText);
  const isPeakValid = peak >= LOWEST_PEAK_NM && peak <= HIGHEST_PEAK_NM;
  const isReady = Boolean(name.trim()) && lasers.length > 0 && isPeakValid;
  const add = () => {
    if (isReady) onAdd({ name: name.trim(), lasers, peak: Math.round(peak) });
  };
  const toggleLaser = (nm: number, isTicked: boolean) =>
    setLasers(current => (isTicked ? [...current, nm] : current.filter(laser => laser !== nm)));

  return (
    <BaseModal
      isOpen
      title="New dye"
      icon={<Palette className="h-4 w-4" />}
      size="xs"
      onClose={onCancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="cancel" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" disabled={!isReady} onClick={add}>
            Add dye
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <label htmlFor={nameId} className={LABEL}>
            Name
          </label>
          <Input
            id={nameId}
            ref={focusOnMount}
            size="sm"
            fullWidth
            value={name}
            onValueChange={setName}
          />
        </div>
        <fieldset className="flex flex-col gap-1.5">
          <legend className={`${LABEL} mb-1.5`}>Lasers that excite it</legend>
          {STANDARD_LASERS_NM.map(nm => (
            <label key={nm} className="flex items-center gap-2 text-body-sm text-foreground">
              <Checkbox
                checked={lasers.includes(nm)}
                aria-label={laserLabel(nm)}
                onChange={isTicked => toggleLaser(nm, isTicked)}
              />
              {laserLabel(nm)}
            </label>
          ))}
        </fieldset>
        <div className="flex flex-col gap-1">
          <label htmlFor={peakId} className={LABEL}>
            Emission peak
          </label>
          <span className="flex items-center gap-2">
            <span className="w-24">
              <Input
                id={peakId}
                size="sm"
                fullWidth
                value={peakText}
                inputMode="numeric"
                state={peakText && !isPeakValid ? 'error' : 'default'}
                inputClassName="text-right font-mono"
                onValueChange={setPeakText}
                onKeyDown={event => {
                  if (event.key === 'Enter') add();
                }}
              />
            </span>
            <span className="text-body-sm text-muted-foreground">nm</span>
          </span>
          <span className="text-body-sm text-muted-foreground">
            The vendor’s spectrum viewer or FPbase lists it. The panel uses it to find the best
            detector.
          </span>
        </div>
      </div>
    </BaseModal>
  );
}
