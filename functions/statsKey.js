const crypto = require('node:crypto');

/** Porównanie klucza w stałym czasie, niezależne od długości podanego ciągu. */
function keyMatches(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string' || !expected) return false;
  const a = crypto.createHash('sha256').update(provided).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  return crypto.timingSafeEqual(a, b);
}

/** Klucz z nagłówka `Authorization: Bearer …` albo pusty ciąg. */
function bearerToken(header) {
  const value = typeof header === 'string' ? header : '';
  return value.startsWith('Bearer ') ? value.slice(7).trim() : '';
}

module.exports = { keyMatches, bearerToken };
