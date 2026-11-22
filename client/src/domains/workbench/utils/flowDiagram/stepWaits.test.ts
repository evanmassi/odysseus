import { durationText, splitStepWait, stepTime } from './stepWaits';

describe('step times', () => {
  it('reads minutes, hours, seconds and overnight', () => {
    expect(stepTime('Spin at 300 ×g for 5 min.')).toEqual({
      label: '5 min',
      minutes: 5,
      isOvernight: false,
    });
    expect(stepTime('Rest 1 h at 37 °C.')?.minutes).toBe(60);
    expect(stepTime('Vortex for 30 s.')?.minutes).toBe(0.5);
    expect(stepTime('Leave at 4 °C overnight.')?.isOvernight).toBe(true);
  });

  it('ignores words that only start like a unit', () => {
    expect(stepTime('Do 3 spins.')).toBeUndefined();
  });

  it('writes totals the way a person would', () => {
    expect(durationText(67)).toBe('1 h 7 min');
    expect(durationText(45)).toBe('45 min');
    expect(durationText(0.5)).toBe('30 s');
  });
});

describe('waits in a step', () => {
  it('treats a step that only waits as all wait', () => {
    expect(splitStepWait('Rest the cells 1 h at 37 °C.')).toEqual({
      action: undefined,
      wait: { time: { label: '1 h', minutes: 60, isOvernight: false }, conditions: ['37 °C'] },
    });
  });

  it('splits an action from the wait that follows it', () => {
    const split = splitStepWait(
      'Add 50 µL surface cocktail and incubate 30 min at 4 °C in the dark.'
    );
    expect(split.action).toBe('Add 50 µL surface cocktail.');
    expect(split.wait?.time.label).toBe('30 min');
    expect(split.wait?.conditions).toEqual(['4 °C', 'dark']);
  });

  it('takes the time and conditions out of a reagent step', () => {
    const split = splitStepWait('Block with 50 µL Fc block for 10 min at room temperature.');
    expect(split.action).toBe('Block with 50 µL Fc block.');
    expect(split.wait?.conditions).toEqual(['RT']);
  });

  it('leaves a time that belongs to a later action in the step', () => {
    const text = 'Resuspend in 1 mL FACS buffer; centrifuge at 300 ×g, 5 min, 4 °C.';
    expect(splitStepWait(text)).toEqual({ action: text, wait: undefined });
  });

  it("takes only the reagent action's own wait when another action follows", () => {
    const split = splitStepWait('Stain with 50 µL cocktail for 20 min at 4 °C; spin at 300 ×g.');
    expect(split.action).toBe('Stain with 50 µL cocktail; spin at 300 ×g.');
    expect(split.wait).toEqual({
      time: { label: '20 min', minutes: 20, isOvernight: false },
      conditions: ['4 °C'],
    });
  });

  it('keeps the time of something you do as part of the step', () => {
    expect(splitStepWait('Spin at 300 ×g for 5 min.')).toEqual({
      action: 'Spin at 300 ×g for 5 min.',
      wait: undefined,
    });
  });
});
