import { panelCocktails } from './flowCytometryCocktails';

import type { FlowCytometryPanelCard, Stain } from '@odysseus/shared-schemas';

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

const panel = (stains: Stain[]): FlowCytometryPanelCard => ({
  id: 'panel',
  type: 'flowCytometryPanel',
  title: 'Flow panel',
  page: 'page',
  x: 0,
  y: 0,
  w: 12,
  h: 10,
  isCollapsed: false,
  markers: [row('cd3', 'Surface'), row('cd4', 'surface'), row('foxp3', 'ICS'), row('cd69', '')],
  stains: stains,
});

const summary = (card: FlowCytometryPanelCard) =>
  panelCocktails(card).stainings.map(({ staining, cocktails, stainsWithout }) => ({
    staining,
    cocktails: cocktails.map(cocktail => [cocktail.name, cocktail.stains.map(entry => entry.name)]),
    without: stainsWithout.map(entry => entry.name),
  }));

describe('panelCocktails', () => {
  it('pools stains whose markers in a staining are the same, per staining', () => {
    const card = panel([
      stain('Full stain', ['cd3', 'cd4', 'foxp3']),
      stain('FMO Foxp3', ['cd4', 'cd3']),
      stain('FMO CD4', ['cd3', 'foxp3']),
      stain('Unstained', []),
    ]);
    expect(summary(card)).toEqual([
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
    const card = panel([
      stain('Full stain', ['foxp3']),
      stain('Isotype', [], [{ id: 'p', materialId: 'isotype', staining: 'ICS' }]),
    ]);
    const { stainings, rowsWithoutStaining } = panelCocktails(card);
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
