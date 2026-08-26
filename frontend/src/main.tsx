import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './app/App';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { registerServiceWorker } from './utils/serviceWorker';
import { watchAppVersion } from './utils/buildVersion';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);

// Po renderze, żeby instalacja workera nie konkurowała o sieć z pierwszym
// malowaniem ani z pobraniem danych. Sygnał udanego startu wysyła `App`,
// dopiero gdy coś naprawdę trafi na ekran.
void registerServiceWorker();

// Niezależnie od workera: gdyby urządzenie zostało na starym wydaniu, ten nadzór
// je z tego wyprowadzi. Bez niego jedynym wyjściem było czyszczenie danych
// przeglądarki (patrz `utils/buildVersion.ts`).
watchAppVersion();
