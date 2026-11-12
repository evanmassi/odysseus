import { stepNumbers } from '../steps/stepNumbering';
import { templateText } from '../steps/stepTemplate';
import { stepVerbBase } from '../steps/stepVerbs';

import {
  actionProse,
  isFlowVerb,
  leadVerb,
  stepLook,
  type StepKind,
  type StepLook,
} from './stepKinds';
import { splitStepWait, stepTime, type StepTime, type StepWait } from './stepWaits';

import type { BoardCalculation } from '../formulas/boardCalculation';
import type { ProtocolStep } from '@odysseus/shared-schemas';

export interface FlowSubStep {
  id: string;
  number: string;
  verb: string | undefined;
  text: string;
  kind: StepKind;
  subSteps: FlowSubStep[];
}

export interface FlowAction {
  verb: string | undefined;
  text: string;
  look: StepLook;
}

export interface FlowStep {
  id: string;
  number: string;
  fullText: string;
  actions: FlowAction[];
  kind: StepKind;
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
  stepOrder: string[];
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

const MAX_ACTIONS = 2;

const pictureLook = (verb: string) => stepLook(stepVerbBase(verb) ?? verb.toLowerCase(), '');

const clauseEnd = (text: string) => text.trim().replace(/(?:[\s,;.]|\band\b|\bthen\b)+$/, '');

function flowActions(shownText: string, fullText: string): FlowAction[] {
  const { verb, base, text } = headline(shownText);
  if (!verb) {
    const later = actionProse(shownText, false).find(
      piece => piece.kind === 'verb' && pictureLook(piece.text).kind !== 'wait'
    );
    const look = later ? pictureLook(later.text) : stepLook(undefined, fullText);
    return [{ verb: undefined, text: shownText, look }];
  }
  const actions: FlowAction[] = [{ verb, text: '', look: stepLook(base, fullText) }];
  let clause = '';
  for (const piece of actionProse(text, false)) {
    const look = piece.kind === 'verb' ? pictureLook(piece.text) : undefined;
    const startsAction =
      look &&
      look.kind !== 'wait' &&
      actions.length < MAX_ACTIONS &&
      !actions.some(action => action.look.picture === look.picture);
    if (!startsAction) {
      clause += piece.text;
      continue;
    }
    actions[actions.length - 1].text = clauseEnd(clause);
    actions.push({ verb: piece.text, text: '', look });
    clause = '';
  }
  actions[actions.length - 1].text = clause.trim();
  return actions;
}

function flowSubStep(id: string, number: string, fullText: string): FlowSubStep {
  const { verb, base, text } = headline(fullText);
  return { id, number, verb, text, kind: stepLook(verb && base, fullText).kind, subSteps: [] };
}

function flowStep(id: string, number: string, fullText: string, shownText: string): FlowStep {
  const actions = flowActions(shownText, fullText);
  return {
    id,
    number,
    fullText,
    actions,
    kind: actions[0].look.kind,
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
      const parent = lastMain?.subSteps[lastMain.subSteps.length - 1];
      const siblings = step.level === 3 && parent ? parent.subSteps : lastMain?.subSteps;
      siblings?.push(flowSubStep(step.id, numberOf(step.id), text));
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
        step: { id: step.id, number: step.number, verb: step.actions[0].verb ?? '' },
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
  if (last?.split.action && last.split.wait) {
    last.step.actions = flowActions(last.step.fullText, last.step.fullText);
  }

  return {
    sections,
    boxes,
    stepOrder: steps.flatMap(step => (step.kind === 'step' && step.level === 1 ? [step.id] : [])),
    minutes: sections.reduce((sum, section) => sum + section.minutes, 0),
    isOvernight: sections.some(section => section.isOvernight),
  };
}
