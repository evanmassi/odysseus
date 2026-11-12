import { leadVerb, stepLook } from './stepKinds';
import { splitStepWait } from './stepWaits';

const pictureOf = (text: string) => stepLook(leadVerb(text).base, text).picture;

describe('step pictures', () => {
  it('shows where a wait happens: fridge, incubator, or the bench', () => {
    expect(pictureOf('Incubate 20 min at room temperature in the dark.')).toBe('stopwatch');
    expect(pictureOf('Incubate 1 h at RT.')).toBe('stopwatch');
    expect(pictureOf('Incubate 72 h at 37 °C.')).toBe('incubator');
    expect(pictureOf('Incubate overnight.')).toBe('incubator');
    expect(pictureOf('Rest the cells 30 min.')).toBe('stopwatch');
    expect(pictureOf('Leave the plate at 4 °C overnight.')).toBe('fridge');
    expect(pictureOf('Keep the cocktail on ice.')).toBe('iceBucket');
  });

  it('reads "let stand" as a wait on the bench', () => {
    expect(leadVerb('Let stand 10 min.')).toEqual({ base: 'stand', wordCount: 2 });
    expect(pictureOf('Let stand 10 min.')).toBe('stopwatch');
    expect(splitStepWait('Let stand 10 min.').action).toBeUndefined();
  });

  it('keeps the pipette picture for adding reagents and falls back to a tube rack', () => {
    expect(pictureOf('Add 50 µL Fc block.')).toBe('tubePipette');
    expect(pictureOf('Aspirate the supernatant.')).toBe('wash');
    expect(pictureOf('Collect the cells into a 15 mL tube.')).toBe('harvest');
    expect(pictureOf('Read absorbance at 450 nm.')).toBe('plateReader');
    expect(pictureOf('Label the tubes.')).toBe('neutral');
    expect(pictureOf('PBMCs from the freezer.')).toBe('neutral');
  });
});
