'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const ForbiddenWordsContext = createContext<string[]>([]);

type ForbiddenWord = { id: string; word: string; added_at?: string };

export const ForbiddenWordsProvider = ({ children }: { children: React.ReactNode }) => {
  const [words, setWords] = useState<string[]>([]);
  useEffect(() => {
    const fetchWords = async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/forbidden_words`);
      const data = await res.json();
      if (data.success) {
        const arr = Array.isArray(data.items) ? data.items : (Array.isArray(data.forbiddenWords) ? data.forbiddenWords : []);
        setWords(arr.map((w: any) => w.word?.toLowerCase?.() || ''));
      } else {
        setWords([]);
      }
    };
    fetchWords();
  }, []);
  return (
    <ForbiddenWordsContext.Provider value={words}>
      {children}
    </ForbiddenWordsContext.Provider>
  );
};

export const useForbiddenWords = () => useContext(ForbiddenWordsContext);