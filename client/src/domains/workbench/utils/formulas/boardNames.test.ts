import cellsAnswers from '../protocolFile/fixtures/cells.answers.json';
import cellsMockup from '../protocolFile/fixtures/cells.mockup.json';
import cytotoxAnswers from '../protocolFile/fixtures/cytotox.answers.json';
import cytotoxMockup from '../protocolFile/fixtures/cytotox.mockup.json';
import elisaAnswers from '../protocolFile/fixtures/elisa.answers.json';
import elisaMockup from '../protocolFile/fixtures/elisa.mockup.json';
import { readProtocolFile } from '../protocolFile/protocolFile';

import { calculateBoard, formulaAnswerText, type FormulaResult } from './boardCalculation';
import { collectBoardNames } from './boardNames';

const EXAMPLES = {
  cells: [cellsMockup, cellsAnswers],
  cytotox: [cytotoxMockup, cytotoxAnswers],
  elisa: [elisaMockup, elisaAnswers],
} as const;

const answerText = (result: FormulaResult | undefined) => {
  if (!result) return 'MISSING';
  if (result.status !== 'ok') return `ERR ${result.message}`;
  return 'error' in result.output ? `OUTERR ${result.output.error}` : formulaAnswerText(result);
};

describe.each(Object.entries(EXAMPLES))('formulas in the %s example', (_, [file, answers]) => {
  it('work out as they did in the mockup', () => {
    const { results } = calculateBoard(collectBoardNames(readProtocolFile(JSON.stringify(file))));
    const port = Object.fromEntries(
      Object.keys(answers).map(id => [id, answerText(results.get(id))])
    );
    expect(port).toEqual(answers);
  });
});
