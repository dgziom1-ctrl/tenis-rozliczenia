// Shared mutable reference to current data snapshot.
// Populated by subscriptions.js on every Firebase update.
// Use getCurrentData() for reads — do not mutate _currentData directly.

let _currentData = null;

export function setCurrentData(data) {
  _currentData = data;
}

export function getCurrentData() {
  return _currentData;
}
