import { calculateBoard } from '../formulas/boardCalculation';

import { flowLayout } from './flowLayout';
import { flowModel, type FlowStep } from './flowModel';

import type { ProtocolStep } from '@odysseus/shared-schemas';

let nextId = 0;
const section = (text: string): ProtocolStep => ({ id: `s${nextId++}`, kind: 'section', text });
const step = (text: string, level: 1 | 2 | 3 = 1, isMeanwhile = false): ProtocolStep => ({
  id: `p${nextId++}`,
  kind: 'step',
  level,
  text,
  isMeanwhile,
});

const STAINING = [
  section('Prepare cells'),
  step('Thaw PBMCs in a 37 °C water bath for 2 min.'),
  step('Wash in 10 mL R10 and spin at 300 ×g for 5 min.'),
  step('Rest the cells 1 h at 37 °C.'),
  step('Count cells and resuspend at 1×10⁶ cells/mL.'),
  step('Mix 10 µL cells with 10 µL trypan blue.', 2),
  step('Make up the surface stain cocktail and keep it on ice.', 1, true),
  section('Stain'),
  step('Block with 50 µL Fc block for 10 min at room temperature.'),
  step('Add 50 µL surface cocktail and incubate {Stain time} at 4 °C in the dark.'),
  step('Wash twice with 200 µL FACS buffer.'),
  step('Leave the plate at 4 °C overnight.'),
];

const calculation = calculateBoard([
  { kind: 'value', id: 'stain', name: 'Stain time', value: '30', unit: 'min' },
]);
const model = flowModel(STAINING, calculation);
const boxNamed = (number: string) => model.boxes.find(box => box.step.number === number)!;
const NOT_MEASURED = new Map<string, number>();
const rowsOf = (shown: FlowStep) => shown.actions.map(action => [action.verb, action.text]);

describe('the flow diagram model', () => {
  it('draws a step that only waits on the arrow, keeping its number', () => {
    expect(model.boxes.map(box => box.step.number)).toEqual(['1', '2', '4', '6', '7', '8', '9']);
    expect(boxNamed('2').waitsAfter).toEqual([
      {
        step: { id: STAINING[3].id, number: '3', verb: 'Rest' },
        time: { label: '1 h', minutes: 60, isOvernight: false },
        conditions: ['37 °C'],
      },
    ]);
  });

  it('moves the wait after an action onto the arrow, read from a name', () => {
    const add = boxNamed('7');
    expect(rowsOf(add.step)).toEqual([['Add', '50 µL surface cocktail.']]);
    expect(add.waitsAfter[0]).toMatchObject({
      step: undefined,
      time: { label: '30 min' },
      conditions: ['4 °C', 'dark'],
    });
  });

  it('keeps a last wait as a box, since nothing follows it', () => {
    const leave = boxNamed('9');
    expect(rowsOf(leave.step)).toEqual([['Leave', 'the plate at 4 °C overnight.']]);
    expect(leave.step.actions[0].look.picture).toBe('fridge');
  });

  it('keeps the wait in the sentence of a last step that acts and then waits', () => {
    const ending = flowModel(
      [step('Spin at 300 ×g for 5 min.'), step('Add 50 µL stain and incubate 30 min at 4 °C.')],
      calculateBoard([])
    );
    expect(rowsOf(ending.boxes[1].step)).toEqual([
      ['Add', '50 µL stain and incubate 30 min at 4 °C.'],
    ]);
  });

  it('folds sub-steps and hangs steps that run during another under it', () => {
    const count = boxNamed('4');
    expect(count.step.subSteps).toEqual([
      {
        id: STAINING[5].id,
        number: 'a',
        verb: 'Mix',
        text: '10 µL cells with 10 µL trypan blue.',
        kind: 'handle',
        subSteps: [],
      },
    ]);
    expect(count.step.during.map(during => during.actions[0].verb)).toEqual(['Make up']);
    expect(count.step.during[0].actions[0].look.picture).toBe('iceBucket');
  });

  it('nests a sub-sub-step under the sub-step before it', () => {
    const nested = flowModel(
      [
        step('Count cells.'),
        step('Mix 10 µL cells with trypan blue.', 2),
        step('Pipette up and down five times.', 3),
        step('Load 10 µL into the slide.', 2),
      ],
      calculateBoard([])
    );
    const outline = nested.boxes[0].step.subSteps.map(sub => [
      sub.number,
      sub.subSteps.map(child => child.number),
    ]);
    expect(outline).toEqual([
      ['a', ['i']],
      ['b', []],
    ]);
  });

  it('lists every whole step in protocol order for moving through them', () => {
    const wholeSteps = STAINING.filter(entry => entry.kind === 'step' && entry.level === 1);
    expect(model.stepOrder).toEqual(wholeSteps.map(entry => entry.id));
    expect(model.stepOrder).toContain(STAINING[3].id);
    expect(model.stepOrder).not.toContain(STAINING[5].id);
  });

  it('counts steps and adds up time per section', () => {
    expect(
      model.sections.map(({ numeral, stepCount, minutes }) => [numeral, stepCount, minutes])
    ).toEqual([
      ['I', 4, 67],
      ['II', 4, 40],
    ]);
    expect(model.isOvernight).toBe(true);
  });
});

describe('steps with more than one action', () => {
  const several = flowModel(
    [
      step('Dilute 10 µL cells 1:1 in trypan blue; counted on the hemocytometer.'),
      step('Add 100 µL substrate; incubate 10 min at RT.'),
      step('PBMCs from the freezer; thawed in the water bath.'),
      step('Spin at 300 ×g for 5 min and pour off the medium.'),
      step('Add 100 µL substrate, shake 2 min, then incubate 10 min at RT.'),
    ],
    calculateBoard([])
  );
  const [dilute, add, thaw, spin, shake] = several.boxes.map(box => box.step);

  it('gives each action Procedure styles its own row with its own words, in order', () => {
    expect(rowsOf(dilute)).toEqual([
      ['Dilute', '10 µL cells 1:1 in trypan blue'],
      ['counted', 'on the hemocytometer.'],
    ]);
    expect(dilute.actions.map(action => action.look)).toEqual([
      { kind: 'handle', picture: 'dilute' },
      { kind: 'measure', picture: 'hemocytometer' },
    ]);
  });

  it('starts a row at a known action after "and" or "then"', () => {
    const [wash, add] = flowModel(
      [
        step('Wash in 10 mL R10 and centrifuge at 300 ×g, 5 min, 4 °C.'),
        step('Add PBS and medium, then vortex briefly.'),
      ],
      calculateBoard([])
    ).boxes.map(box => box.step);
    expect(rowsOf(wash)).toEqual([
      ['Wash', 'in 10 mL R10'],
      ['centrifuge', 'at 300 ×g, 5 min, 4 °C.'],
    ]);
    expect(rowsOf(add)).toEqual([
      ['Add', 'PBS and medium'],
      ['vortex', 'briefly.'],
    ]);
  });

  it('keeps an action with the same picture in the row before it', () => {
    const wash = flowModel([step('Wash in PBS; rinse twice.')], calculateBoard([])).boxes[0].step;
    expect(rowsOf(wash)).toEqual([['Wash', 'in PBS; rinse twice.']]);
  });

  it('leaves a wait after a semicolon to the arrow, not a second picture', () => {
    expect(rowsOf(add)).toEqual([['Add', '100 µL substrate.']]);
    expect(several.boxes[1].waitsAfter[0]).toMatchObject({
      time: { label: '10 min' },
      conditions: ['RT'],
    });
  });

  it('uses a later action instead of the fallback when the step opens without a verb', () => {
    expect(rowsOf(thaw)).toEqual([
      [undefined, 'PBMCs from the freezer; thawed in the water bath.'],
    ]);
    expect(thaw.actions[0].look.picture).toBe('waterBath');
  });

  it('keeps a time in the text as typed', () => {
    expect(rowsOf(spin)).toEqual([['Spin', 'at 300 ×g for 5 min and pour off the medium.']]);
  });

  it('keeps the time of an action when its wait moves to the arrow', () => {
    expect(rowsOf(shake)).toEqual([
      ['Add', '100 µL substrate, shake 2 min, then incubate 10 min at RT.'],
    ]);
    expect(several.boxes[4].waitsAfter).toEqual([]);
    expect(several.sections[0].minutes).toBe(10 + 5 + 2 + 10);
  });

  it('gives a two-action box one more row of height, not more width', () => {
    const layout = flowLayout(several, 400, NOT_MEASURED);
    expect(layout.steps.map(placed => placed.height)).toEqual([130, 70, 70, 70, 70]);
    expect(new Set(layout.steps.map(placed => placed.width)).size).toBe(1);
  });
});

describe('the flow diagram layout', () => {
  it('sizes boxes to their measured text and lines a row up on its tallest box', () => {
    const measured = new Map([[STAINING[2].id, 150]]);
    const layout = flowLayout(model, 2000, measured);
    const firstRow = layout.steps.filter(
      placed => !placed.duringOf && placed.y === layout.steps[0].y
    );
    expect(firstRow.map(placed => [placed.step.number, placed.height])).toEqual([
      ['1', 164],
      ['2', 164],
      ['4', 164],
    ]);
  });

  it('widens every box alike to fill the fullest row, up to a cap', () => {
    const wide = flowLayout(model, 2000, NOT_MEASURED);
    expect(new Set(wide.steps.map(placed => placed.width))).toEqual(new Set([340]));
    const snug = flowLayout(model, 1000, NOT_MEASURED);
    const [snugWidth] = new Set(snug.steps.map(placed => placed.width));
    expect(snugWidth).toBeGreaterThan(236);
    expect(Math.max(...snug.steps.map(placed => placed.x + placed.width))).toBeLessThanOrEqual(990);
  });

  it('starts every section on its own row', () => {
    const layout = flowLayout(model, 2000, NOT_MEASURED);
    expect(layout.frames.map(frame => [frame.sectionIndex, frame.isContinued])).toEqual([
      [0, false],
      [1, false],
    ]);
  });

  it('wraps a long section and marks the next row as continued', () => {
    const layout = flowLayout(model, 600, NOT_MEASURED);
    expect(
      layout.frames.filter(frame => frame.sectionIndex === 1).map(frame => frame.isContinued)
    ).toEqual([false, true, true]);
  });

  it('stacks each section in one column when two steps do not fit side by side', () => {
    const layout = flowLayout(model, 400, NOT_MEASURED);
    expect(layout.frames.map(frame => [frame.sectionIndex, frame.isContinued])).toEqual([
      [0, false],
      [1, false],
    ]);
    expect(new Set(layout.steps.map(placed => placed.x))).toEqual(new Set([26]));
  });

  it('puts the waits on the arrow they belong to', () => {
    const layout = flowLayout(model, 2000, NOT_MEASURED);
    expect(
      layout.arrows.filter(arrow => arrow.waits.length).map(arrow => arrow.waits[0].time.label)
    ).toEqual(['1 h', '10 min', '30 min']);
  });
});
