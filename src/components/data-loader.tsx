'use client';

import { useEffect, useRef } from 'react';
import { useLedgerStore } from '@/lib/store';

export function DataLoader() {
  const { isLoaded, isLoading, loadAllData } = useLedgerStore();
  const loadingRef = useRef(false);

  useEffect(() => {
    // Only load once
    if (!isLoaded && !isLoading && !loadingRef.current) {
      loadingRef.current = true;
      loadAllData().finally(() => {
        loadingRef.current = false;
      });
    }
  }, [isLoaded, isLoading, loadAllData]);

  return null;
}
