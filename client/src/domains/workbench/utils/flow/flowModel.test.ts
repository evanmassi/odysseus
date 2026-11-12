import { calculateBoard } from '../formulas/boardCalculation';

import { flowLayout } from './flowLayout';
import { flowModel } from './flowModel';

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
    expect(add.step.verbs).toEqual(['Add']);
    expect(add.step.text).toBe('50 µL surface cocktail.');
    expect(add.step.timeInBox).toBeUndefined();
    expect(add.waitsAfter[0]).toMatchObject({
      step: undefined,
      time: { label: '30 min' },
      conditions: ['4 °C', 'dark'],
    });
  });

  it('keeps a last wait as a box, since nothing follows it', () => {
    const leave = boxNamed('9');
    expect(leave.step.timeInBox?.label).toBe('overnight');
    expect(leave.step.pictures.map(look => look.picture)).toEqual(['fridge']);
  });

  it('folds sub-steps and hangs steps that run during another under it', () => {
    const count = boxNamed('4');
    expect(count.step.subSteps.map(sub => sub.number)).toEqual(['a']);
    expect(count.step.during.map(during => during.verbs)).toEqual([['Make up']]);
    expect(count.step.during[0].pictures[0].picture).toBe('iceBucket');
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

  it('shows a picture for each action Procedure styles, in order', () => {
    expect(dilute.verbs).toEqual(['Dilute', 'counted']);
    expect(dilute.text).toBe('10 µL cells 1:1 in trypan blue; on the hemocytometer.');
    expect(dilute.pictures).toEqual([
      { kind: 'handle', picture: 'dilute' },
      { kind: 'measure', picture: 'hemocytometer' },
    ]);
  });

  it('leaves a wait after a semicolon to the arrow, not a second picture', () => {
    expect(add.verbs).toEqual(['Add']);
    expect(add.text).toBe('100 µL substrate.');
    expect(several.boxes[1].waitsAfter[0]).toMatchObject({
      time: { label: '10 min' },
      conditions: ['RT'],
    });
  });

  it('uses a later action instead of the fallback when the step opens without a verb', () => {
    expect(thaw.verbs).toEqual(['thawed']);
    expect(thaw.pictures.map(look => look.picture)).toEqual(['waterBath']);
  });

  it('shows a time once, in the corner, not again in the text', () => {
    expect(spin.timeInBox?.label).toBe('5 min');
    expect(spin.text).toBe('at 300 ×g and pour off the medium.');
  });

  it('keeps the time of an action when its wait moves to the arrow', () => {
    expect(shake.timeInBox?.label).toBe('2 min');
    expect(several.boxes[4].waitsAfter).toEqual([]);
    expect(several.sections[0].minutes).toBe(10 + 5 + 2 + 10);
  });

  it('gives a two-picture box one more picture of width', () => {
    const layout = flowLayout(several, 2000);
    expect(layout.steps.map(placed => placed.width)).toEqual([292, 236, 236, 236, 236]);
  });
});

describe('the flow diagram layout', () => {
  it('starts every section on its own row', () => {
    const layout = flowLayout(model, 2000);
    expect(layout.frames.map(frame => [frame.sectionIndex, frame.isContinued])).toEqual([
      [0, false],
      [1, false],
    ]);
  });

  it('wraps a long section and marks the next row as continued', () => {
    const layout = flowLayout(model, 600);
    expect(
      layout.frames.filter(frame => frame.sectionIndex === 1).map(frame => frame.isContinued)
    ).toEqual([false, true, true]);
  });

  it('stacks each section in one column when two steps do not fit side by side', () => {
    const layout = flowLayout(model, 400);
    expect(layout.frames.map(frame => [frame.sectionIndex, frame.isContinued])).toEqual([
      [0, false],
      [1, false],
    ]);
    expect(new Set(layout.steps.map(placed => placed.x))).toEqual(new Set([26]));
  });

  it('puts the waits on the arrow they belong to', () => {
    const layout = flowLayout(model, 2000);
    expect(
      layout.arrows.filter(arrow => arrow.waits.length).map(arrow => arrow.waits[0].time.label)
    ).toEqual(['1 h', '10 min', '30 min']);
  });
});
