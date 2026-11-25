import cellsAnswers from '../protocolFile/fixtures/cells.answers.json';
import cellsSample from '../protocolFile/fixtures/cells.json';
import cytotoxAnswers from '../protocolFile/fixtures/cytotox.answers.json';
import cytotoxSample from '../protocolFile/fixtures/cytotox.json';
import elisaAnswers from '../protocolFile/fixtures/elisa.answers.json';
import elisaSample from '../protocolFile/fixtures/elisa.json';
import { readProtocolFile } from '../protocolFile/protocolFile';

import { calculateBoard, calculationAnswerText, type CalculationResult } from './boardCalculation';
import { collectBoardNames } from './boardNames';

const EXAMPLES = {
  cells: [cellsSample, cellsAnswers],
  cytotox: [cytotoxSample, cytotoxAnswers],
  elisa: [elisaSample, elisaAnswers],
} as const;

const answerText = (result: CalculationResult | undefined) => {
  if (!result) return 'MISSING';
  if (result.status !== 'ok') return `ERR ${result.message}`;
  return 'error' in result.output ? `OUTERR ${result.output.error}` : calculationAnswerText(result);
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
