// Shared mutable reference to current data snapshot
// Populated by subscriptions.js on every Firebase update

export let _currentData = null;

export function setCurrentData(data) {
  _currentData = data;
}

export function requireData() {
  if (!_currentData) {
    throw new Error('Brak połączenia z bazą danych');
  }
  return _currentData;
}
