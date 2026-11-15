import type { ReactNode } from 'react';

const CASE_SENSITIVE_LETTERS = /([µͰ-Ͽἀ-῿]+)/;

export const capsKeepingGreek = (text: string): ReactNode[] =>
  text.split(CASE_SENSITIVE_LETTERS).map((part, index) =>
    index % 2 ? (
      <span key={index} className="normal-case">
        {part}
      </span>
    ) : (
      part
    )
  );
