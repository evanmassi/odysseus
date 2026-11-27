import { panelCocktails } from './flowCytometryCocktails';

import type { FlowCytometryPanel, Stain } from '@odysseus/shared-schemas';

const row = (id: string, stain: string) => ({
  id,
  materialId: `m-${id}`,
  detectorId: id,
  staining: stain,
  dilution: '100',
});

const stain = (name: string, rowIds: string[], plus: Stain['plus'] = []): Stain => ({
  id: name,
  name,
  markerIds: rowIds,
  plus,
});

const panel = (stains: Stain[]): FlowCytometryPanel => ({
  id: 'panel',
  title: 'Flow panel',
  markers: [row('cd3', 'Surface'), row('cd4', 'surface'), row('foxp3', 'ICS'), row('cd69', '')],
  stains: stains,
});

const summary = (flowPanel: FlowCytometryPanel) =>
  panelCocktails(flowPanel).stainings.map(({ staining, cocktails, stainsWithout }) => ({
    staining,
    cocktails: cocktails.map(cocktail => [cocktail.name, cocktail.stains.map(entry => entry.name)]),
    without: stainsWithout.map(entry => entry.name),
  }));

describe('panelCocktails', () => {
  it('pools stains whose markers in a staining are the same, per staining', () => {
    const flowPanel = panel([
      stain('Full stain', ['cd3', 'cd4', 'foxp3']),
      stain('FMO Foxp3', ['cd4', 'cd3']),
      stain('FMO CD4', ['cd3', 'foxp3']),
      stain('Unstained', []),
    ]);
    expect(summary(flowPanel)).toEqual([
      {
        staining: 'Surface',
        cocktails: [
          ['Full stain Surface cocktail', ['Full stain', 'FMO Foxp3']],
          ['FMO CD4 Surface cocktail', ['FMO CD4']],
        ],
        without: ['Unstained'],
      },
      {
        staining: 'ICS',
        cocktails: [['Full stain ICS cocktail', ['Full stain', 'FMO CD4']]],
        without: ['FMO Foxp3', 'Unstained'],
      },
    ]);
  });

  it('keeps a stain with an extra material apart, and lists markers with no staining', () => {
    const flowPanel = panel([
      stain('Full stain', ['foxp3']),
      stain('Isotype', [], [{ id: 'p', materialId: 'isotype', staining: 'ICS' }]),
    ]);
    const { stainings, rowsWithoutStaining } = panelCocktails(flowPanel);
    const ics = stainings.find(staining => staining.staining === 'ICS');
    expect(ics?.cocktails.map(cocktail => cocktail.name)).toEqual([
      'Full stain ICS cocktail',
      'Isotype ICS cocktail',
    ]);
    expect(rowsWithoutStaining.map(entry => entry.id)).toEqual(['cd69']);
  });

  it('lists a cocktail’s markers in panel order whatever order they were ticked', () => {
    const [surface] = panelCocktails(panel([stain('Full stain', ['cd4', 'cd3'])])).stainings;
    expect(surface.cocktails[0].rows.map(entry => entry.id)).toEqual(['cd3', 'cd4']);
  });
});

describe('a secondary in the cocktails', () => {
  it('joins its own staining only in the stains that have its primary', () => {
    const flowPanel = panel([stain('Full stain', ['cd3', 'cd19']), stain('FMO CD19', ['cd3'])]);
    flowPanel.markers.push({
      ...row('cd19', 'Surface'),
      secondary: { materialId: 'm-sape', staining: 'Secondary' },
    });
    const secondary = panelCocktails(flowPanel).stainings.find(
      entry => entry.staining === 'Secondary'
    );
    expect(secondary?.cocktails.map(cocktail => cocktail.stains.map(entry => entry.name))).toEqual([
      ['Full stain'],
    ]);
    expect(secondary?.cocktails[0].rows.map(entry => entry.materialId)).toEqual(['m-sape']);
    expect(secondary?.stainsWithout.map(entry => entry.name)).toEqual(['FMO CD19']);
  });
});
