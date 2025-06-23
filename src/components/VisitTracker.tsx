'use client';

import { useEffect } from 'react';

export default function VisitTracker() {
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/visits`, { method: 'POST' });
  }, []);

  return null;
}
