import { stepNumbers } from '../steps/stepNumbering';
import { splitProse, templateText } from '../steps/stepTemplate';
import { stepVerbBase } from '../steps/stepVerbs';

import { isFlowVerb, leadVerb, stepLook, type StepKind, type StepLook } from './stepKinds';
import { splitStepWait, stepTime, withoutTime, type StepTime, type StepWait } from './stepWaits';

import type { BoardCalculation } from '../formulas/boardCalculation';
import type { ProtocolStep } from '@odysseus/shared-schemas';

export interface FlowSubStep {
  id: string;
  number: string;
  text: string;
}

export interface FlowStep {
  id: string;
  number: string;
  fullText: string;
  verbs: string[];
  text: string;
  timeInBox: StepTime | undefined;
  kind: StepKind;
  pictures: StepLook[];
  subSteps: FlowSubStep[];
  during: FlowStep[];
}

export interface FlowWait {
  step: { id: string; number: string; verb: string } | undefined;
  time: StepTime;
  conditions: string[];
}

export interface FlowSection {
  numeral: string | undefined;
  title: string;
  stepCount: number;
  minutes: number;
  isOvernight: boolean;
}

export interface FlowBox {
  step: FlowStep;
  sectionIndex: number;
  waitsAfter: FlowWait[];
}

export interface FlowModel {
  sections: FlowSection[];
  boxes: FlowBox[];
  minutes: number;
  isOvernight: boolean;
}

interface MainStep {
  step: FlowStep;
  sectionIndex: number;
  split: { action: string | undefined; wait: StepWait | undefined };
}

function headline(text: string): { verb: string | undefined; base: string; text: string } {
  const words = text.trim().split(/\s+/);
  const { base, wordCount } = leadVerb(text);
  if (!isFlowVerb(base)) return { verb: undefined, base, text };
  return {
    verb: words.slice(0, wordCount).join(' '),
    base,
    text: words.slice(wordCount).join(' '),
  };
}

const MAX_PICTURES = 2;

interface StepAction {
  base: string;
  shown: string;
  look: StepLook;
}

function laterActions(text: string): StepAction[] {
  return splitProse(text, false).flatMap(piece => {
    if (piece.kind !== 'verb') return [];
    const base = stepVerbBase(piece.text) ?? piece.text.toLowerCase();
    const look = stepLook(base, '');
    return look.kind === 'wait' ? [] : [{ base, shown: piece.text, look }];
  });
}

function withoutVerbs(text: string, verbs: ReadonlySet<string>): string {
  return splitProse(text, false)
    .filter(piece => piece.kind !== 'verb' || !verbs.has(piece.text))
    .map(piece => piece.text)
    .join('')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

const firstOfEach = <Item>(items: readonly Item[], keyOf: (item: Item) => string) =>
  items.filter((item, index) => items.findIndex(other => keyOf(other) === keyOf(item)) === index);

function flowStep(id: string, number: string, fullText: string, shownText: string): FlowStep {
  const { verb, base, text } = headline(shownText);
  const lead = stepLook(verb && base, fullText);
  const later = laterActions(text);
  const actions = [...(verb ? [{ base, shown: verb, look: lead }] : []), ...later];
  const timeInBox = stepTime(shownText);
  const remaining = withoutVerbs(text, new Set(later.map(action => action.shown)));
  const pictures = actions.length
    ? firstOfEach(
        actions.map(action => action.look),
        look => look.picture
      ).slice(0, MAX_PICTURES)
    : [lead];
  return {
    id,
    number,
    fullText,
    verbs: firstOfEach(actions, action => action.base).map(action => action.shown),
    text: timeInBox ? withoutTime(remaining, timeInBox) : remaining,
    timeInBox,
    kind: pictures[0].kind,
    pictures,
    subSteps: [],
    during: [],
  };
}

const ridesArrow = (main: MainStep, index: number, count: number) =>
  !main.split.action &&
  !!main.split.wait &&
  index > 0 &&
  index < count - 1 &&
  !main.step.during.length &&
  !main.step.subSteps.length;

export function flowModel(
  steps: readonly ProtocolStep[],
  calculation: BoardCalculation
): FlowModel {
  const numbers = stepNumbers(steps);
  const numberOf = (id: string) => (numbers.get(id) ?? '').replace('.', '');
  const sections: FlowSection[] = [];
  const mains: MainStep[] = [];
  const sectionIndex = () => {
    if (!sections.length) {
      sections.push({
        numeral: undefined,
        title: '',
        stepCount: 0,
        minutes: 0,
        isOvernight: false,
      });
    }
    return sections.length - 1;
  };
  let lastOnTrack: MainStep | undefined;
  let lastMain: FlowStep | undefined;

  for (const step of steps) {
    if (step.kind === 'section') {
      sections.push({
        numeral: numberOf(step.id),
        title: step.text.trim(),
        stepCount: 0,
        minutes: 0,
        isOvernight: false,
      });
      continue;
    }
    const text = templateText(step.text, calculation).trim();
    if (step.level > 1) {
      lastMain?.subSteps.push({ id: step.id, number: numberOf(step.id), text });
      continue;
    }
    if (step.isMeanwhile && lastOnTrack) {
      lastMain = flowStep(step.id, numberOf(step.id), text, text);
      lastOnTrack.step.during.push(lastMain);
      continue;
    }
    const split = splitStepWait(text);
    const main: MainStep = {
      step: flowStep(step.id, numberOf(step.id), text, split.action ?? text),
      sectionIndex: sectionIndex(),
      split,
    };
    const section = sections[main.sectionIndex];
    section.stepCount++;
    const times = [split.wait?.time, split.action ? stepTime(split.action) : undefined];
    section.minutes += times.reduce((sum, time) => sum + (time?.minutes ?? 0), 0);
    section.isOvernight ||= times.some(time => time?.isOvernight);
    mains.push(main);
    lastOnTrack = main;
    lastMain = main.step;
  }

  const boxes: FlowBox[] = [];
  const boxed: MainStep[] = [];
  let riding: FlowWait[] = [];
  mains.forEach((main, index) => {
    const { step, split } = main;
    if (split.wait && ridesArrow(main, index, mains.length)) {
      riding.push({
        step: { id: step.id, number: step.number, verb: step.verbs[0] ?? '' },
        ...split.wait,
      });
      return;
    }
    const previous = boxed[boxed.length - 1];
    if (previous) {
      const own = previous.split;
      const carried = own.action && own.wait ? [{ step: undefined, ...own.wait }] : [];
      boxes[boxes.length - 1].waitsAfter = [...carried, ...riding];
    }
    riding = [];
    boxed.push(main);
    boxes.push({ step, sectionIndex: main.sectionIndex, waitsAfter: [] });
  });

  const last = boxed[boxed.length - 1];
  if (last?.split.action && last.split.wait && !last.step.timeInBox) {
    last.step.timeInBox = last.split.wait.time;
  }

  return {
    sections,
    boxes,
    minutes: sections.reduce((sum, section) => sum + section.minutes, 0),
    isOvernight: sections.some(section => section.isOvernight),
  };
}
