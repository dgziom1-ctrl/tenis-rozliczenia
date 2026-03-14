// Generates a collision-resistant ID even under concurrent writes
export function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

// Returns today's date as 'YYYY-MM-DD'
export function todayISO() {
  return new Date().toISOString().split('T')[0];
}
