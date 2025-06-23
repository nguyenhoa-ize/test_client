'use client';
import React, { forwardRef } from 'react';
import { useForbiddenWords } from '@/contexts/ForbiddenWordsContext';
import { filterForbiddenWords } from '@/utils/filterForbiddenWords';

const FilteredTextarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  (props, ref) => {
    const forbiddenWords = useForbiddenWords();
    return (
      <textarea
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

FilteredTextarea.displayName = 'FilteredTextarea';

export default FilteredTextarea;