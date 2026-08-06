import { Suspense } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

// Pusty fallback zamiast spinnera: strony ładują się z tego samego bundla w
// ułamku sekundy, a migający placeholder byłby bardziej widoczny niż samo
// oczekiwanie.
function PageFallback() {
  return null;
}

export function LazyPage({ Component }: { Component: LazyExoticComponent<ComponentType> }) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Component />
    </Suspense>
  );
}
