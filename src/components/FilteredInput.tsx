'use client';
import React, { forwardRef } from 'react';
import { useForbiddenWords } from '@/contexts/ForbiddenWordsContext';
import { filterForbiddenWords } from '@/utils/filterForbiddenWords';

const FilteredInput = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => {
    const forbiddenWords = useForbiddenWords();
    return (
      <input
        {...props}
        ref={ref}
        onChange={e => {
          const filtered = filterForbiddenWords(e.target.value, forbiddenWords);
          props.onChange?.({ ...e, target: { ...e.target, value: filtered } });
        }}
      />
    );
  }
);

FilteredInput.displayName = 'FilteredInput';

export default FilteredInput;