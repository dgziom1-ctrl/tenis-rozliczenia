// Module-scoped state — intentionally mutable singleton.
// Used by firebase transactions that need current data outside React tree.
// Safe because: (1) single-threaded JS, (2) always written by onValue before read by transactions.
let _currentData = null;

export function setCurrentData(data) {
  _currentData = Object.freeze(data); // prevent accidental mutation
}

export function getCurrentData() {
  return _currentData;
}
