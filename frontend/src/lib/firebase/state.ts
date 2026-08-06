import type { NormalizedData } from '@/types/domain';

let _currentData: Readonly<NormalizedData> | null = null;

export function setCurrentData(data: NormalizedData): void {
  _currentData = Object.freeze(data) as Readonly<NormalizedData>;
}

export function getCurrentData(): Readonly<NormalizedData> | null {
  return _currentData;
}
