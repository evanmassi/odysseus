export interface Pipette {
  name: string;
  min: number;
  max: number;
  step: number;
}

export type PipetteUse = 'stock' | 'series' | 'plating';

const EPSILON = 1e-9;

export const PIPETTES: Readonly<Record<PipetteUse, readonly Pipette[]>> = {
  stock: [
    { name: 'P2', min: 0.1, max: 2, step: 0.002 },
    { name: 'P10', min: 0.5, max: 10, step: 0.02 },
    { name: 'P20', min: 2, max: 20, step: 0.02 },
    { name: 'P100', min: 10, max: 100, step: 0.2 },
    { name: 'P200', min: 20, max: 200, step: 0.2 },
    { name: 'P1000', min: 100, max: 1000, step: 2 },
  ],
  series: [
    { name: '12-ch 10 µL', min: 0.5, max: 10, step: 0.02 },
    { name: '12-ch 20 µL', min: 2, max: 20, step: 0.02 },
    { name: '12-ch 50 µL', min: 5, max: 50, step: 0.05 },
    { name: '12-ch 100 µL', min: 10, max: 100, step: 0.2 },
    { name: '12-ch 200 µL', min: 20, max: 200, step: 0.2 },
    { name: '12-ch 300 µL', min: 20, max: 300, step: 0.5 },
    { name: '12-ch 1200 µL', min: 100, max: 1200, step: 2 },
  ],
  plating: [
    { name: '24-ch 20 µL', min: 1, max: 20, step: 0.02 },
    { name: '24-ch 100 µL', min: 5, max: 100, step: 0.1 },
  ],
};

export const pipetteFor = (use: PipetteUse, volume: number): Pipette | undefined =>
  PIPETTES[use].find(pipette => volume >= pipette.min - EPSILON && volume <= pipette.max + EPSILON);

export const dialNearest = (pipette: Pipette | undefined, volume: number) =>
  pipette ? Math.round(volume / pipette.step) * pipette.step : volume;

export const dialUp = (pipette: Pipette | undefined, volume: number) =>
  pipette ? Math.ceil(volume / pipette.step - EPSILON) * pipette.step : volume;

const dialDigits = ({ step }: Pipette) => (step < 0.01 ? 3 : step < 0.1 ? 2 : step < 1 ? 1 : 0);

export const shortNumber = (value: number) => String(Number(value.toPrecision(3)));

export const dialNumber = (pipette: Pipette | undefined, volume: number) =>
  pipette ? String(Number(volume.toFixed(dialDigits(pipette)))) : shortNumber(volume);
