import { panelCocktails } from './cytometerCocktails';

import type { CytometerBlock } from '@odysseus/shared-schemas';

type Mix = CytometerBlock['mixes'][number];

const row = (id: string, stain: string) => ({
  id,
  materialId: `m-${id}`,
  detectorId: id,
  stain,
  dilution: '100',
});

const mix = (name: string, rowIds: string[], plus: Mix['plus'] = []): Mix => ({
  id: name,
  name,
  rowIds,
  plus,
});

const panel = (mixes: Mix[]): CytometerBlock => ({
  id: 'panel',
  type: 'cytometer',
  title: 'Flow panel',
  page: 'page',
  x: 0,
  y: 0,
  w: 12,
  h: 10,
  isCollapsed: false,
  rows: [row('cd3', 'Surface'), row('cd4', 'surface'), row('foxp3', 'ICS'), row('cd69', '')],
  mixes,
});

const summary = (block: CytometerBlock) =>
  panelCocktails(block).steps.map(({ step, cocktails, mixesWithout }) => ({
    step,
    cocktails: cocktails.map(cocktail => [cocktail.name, cocktail.mixes.map(entry => entry.name)]),
    without: mixesWithout.map(entry => entry.name),
  }));

describe('panelCocktails', () => {
  it('pools mixes whose stains in a step are the same, per stain step', () => {
    const block = panel([
      mix('Full stain', ['cd3', 'cd4', 'foxp3']),
      mix('FMO Foxp3', ['cd4', 'cd3']),
      mix('FMO CD4', ['cd3', 'foxp3']),
      mix('Unstained', []),
    ]);
    expect(summary(block)).toEqual([
      {
        step: 'Surface',
        cocktails: [
          ['Full stain Surface', ['Full stain', 'FMO Foxp3']],
          ['FMO CD4 Surface', ['FMO CD4']],
        ],
        without: ['Unstained'],
      },
      {
        step: 'ICS',
        cocktails: [['Full stain ICS', ['Full stain', 'FMO CD4']]],
        without: ['FMO Foxp3', 'Unstained'],
      },
    ]);
  });

  it('keeps a mix with an extra material apart, and lists stains with no step', () => {
    const block = panel([
      mix('Full stain', ['foxp3']),
      mix('Isotype', [], [{ id: 'p', materialId: 'isotype', stain: 'ICS' }]),
    ]);
    const { steps, rowsWithoutStep } = panelCocktails(block);
    const ics = steps.find(step => step.step === 'ICS');
    expect(ics?.cocktails.map(cocktail => cocktail.name)).toEqual([
      'Full stain ICS',
      'Isotype ICS',
    ]);
    expect(rowsWithoutStep.map(entry => entry.id)).toEqual(['cd69']);
  });

  it('lists a cocktail’s stains in panel order whatever order they were ticked', () => {
    const [surface] = panelCocktails(panel([mix('Full stain', ['cd4', 'cd3'])])).steps;
    expect(surface.cocktails[0].rows.map(entry => entry.id)).toEqual(['cd3', 'cd4']);
  });
});
