'use client';

import { useEffect, useState } from 'react';
import { AppData } from './types';
import { emptyData, sampleData } from './reading';

const KEY = 'reading-habit-tracker:v1';

export function loadData(): AppData {
  if (typeof window === 'undefined') return emptyData();
  const raw = window.localStorage.getItem(KEY);
  if (!raw) {
    const seeded = sampleData();
    window.localStorage.setItem(KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    return { ...emptyData(), ...JSON.parse(raw) };
  } catch {
    return emptyData();
  }
}

export function saveData(data: AppData) {
  window.localStorage.setItem(KEY, JSON.stringify(data));
}

export function clearData() {
  window.localStorage.removeItem(KEY);
}

export function useAppData() {
  const [data, setData] = useState<AppData>(emptyData());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(loadData());
    setReady(true);
  }, []);

  const updateData = (next: AppData | ((current: AppData) => AppData)) => {
    setData((current) => {
      const value = typeof next === 'function' ? next(current) : next;
      saveData(value);
      return value;
    });
  };

  return { data, setData: updateData, ready };
}
