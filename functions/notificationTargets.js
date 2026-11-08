// Czyste helpery do powiadomień — bez zależności od Firebase, żeby dało się je
// testować z poziomu frontendu (patrz `functionsParity.test.js`).

/**
 * Progi serii, o których informujemy push-em. Ta sama lista jest w aplikacji
 * (`frontend/src/utils/achievements.ts`), dzięki czemu push i plakietka
 * w aplikacji pojawiają się przy tych samych liczbach.
 */
const STREAK_MILESTONES = [5, 10, 15, 20, 25, 30, 40, 50, 100];

/** Token zapisany bez wybranego gracza dostaje `unknown` (patrz `buildTokenEntry`). */
const NO_PLAYER = new Set(['', 'unknown']);

function readToken(entry) {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry.token === 'string') return entry.token;
  return '';
}

/**
 * Wybiera tokeny osób z listy `playerNames` oraz te, które nie mają przypisanego
 * gracza (nie wiemy, kim są, więc wolimy powiadomić niż pominąć).
 * Gdy `playerNames` jest `null`, zwraca wszystkie tokeny.
 * Wynik bez duplikatów (ta sama przeglądarka bywa zapisana pod kilkoma kluczami).
 */
function selectTokens(entries, playerNames = null) {
  const wanted = playerNames ? new Set(playerNames) : null;
  const tokens = [];
  for (const entry of Object.values(entries || {})) {
    const token = readToken(entry);
    if (!token) continue;
    if (wanted) {
      const name = entry && typeof entry === 'object' && typeof entry.playerName === 'string'
        ? entry.playerName
        : '';
      if (!NO_PLAYER.has(name) && !wanted.has(name)) continue;
    }
    tokens.push(token);
  }
  return [...new Set(tokens)];
}

module.exports = { STREAK_MILESTONES, selectTokens };
