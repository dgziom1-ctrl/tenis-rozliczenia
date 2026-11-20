// Stabilny zapis drzewa DOM do testów charakteryzujących (snapshotów).
//
// Zwykły snapshot DOM łamie się przy każdym refaktorze, który nic nie zmienia
// dla użytkownika: przesunięcie JSX do podkomponentu zmienia numerację `useId`,
// kolejność atrybutów albo kolejność właściwości w `style`. Tu normalizujemy
// dokładnie takie rzeczy, a zostawiamy wszystko, co widzi lub słyszy człowiek:
// tagi, tekst, ARIA, klasy, wartości pól i style (jako zbiór deklaracji).

import { vi } from 'vitest';

/** Atrybuty, które trzymają identyfikatory (lub ich listy) wygenerowane przez `useId`. */
const ID_REFERENCES = ['id', 'for', 'aria-labelledby', 'aria-describedby', 'aria-controls', 'aria-owns', 'list'];

/** `useId` zwraca `:r0:`, `«r0»` albo `_r_0_` zależnie od wersji Reacta. */
const GENERATED_ID = /^(?:[:«]r[0-9a-z]+[:»]|_r_[0-9a-z]+_)$/;

/** Dzieli deklaracje stylu po `;`, ale nie wewnątrz nawiasów (`calc(...)`, `url(...)`). */
function splitDeclarations(css) {
  const out = [];
  let depth = 0;
  let current = '';
  for (const ch of css) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ';' && depth === 0) {
      if (current.trim()) out.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) out.push(current.trim());
  return out;
}

function normalizeStyle(css) {
  return splitDeclarations(css)
    .map((declaration) => {
      const at = declaration.indexOf(':');
      return `${declaration.slice(0, at).trim()}: ${declaration.slice(at + 1).trim().replace(/\s+/g, ' ')}`;
    })
    .sort()
    .join('; ');
}

function collectGeneratedIds(root, ids) {
  for (const el of root.querySelectorAll('[id]')) {
    const id = el.getAttribute('id');
    if (GENERATED_ID.test(id) && !ids.has(id)) ids.set(id, `#id${ids.size + 1}`);
  }
}

function mapIds(value, ids) {
  return value.split(/\s+/).map(token => ids.get(token) ?? token).join(' ');
}

function attributesOf(el, ids) {
  const attrs = new Map();
  for (const { name, value } of Array.from(el.attributes)) {
    if (name === 'class') {
      const classes = value.split(/\s+/).filter(Boolean).sort().join(' ');
      if (classes) attrs.set(name, classes);
    } else if (name === 'style') {
      const style = normalizeStyle(value);
      if (style) attrs.set(name, style);
    } else if (ID_REFERENCES.includes(name)) {
      attrs.set(name, mapIds(value, ids));
    } else {
      attrs.set(name, value);
    }
  }
  // Bieżąca wartość pola, nie tylko atrybut z pierwszego renderu.
  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) {
    if (el.type === 'checkbox' || el.type === 'radio') {
      attrs.set('checked', String(el.checked));
    } else {
      attrs.set('value', el.value);
    }
  }
  return [...attrs.entries()].sort(([a], [b]) => a.localeCompare(b));
}

function render(node, depth, ids, lines) {
  const pad = '  '.repeat(depth);
  const children = Array.from(node.childNodes);
  // Sąsiednie węzły tekstowe scalamy: React dzieli `{a} zł` na kilka, a to
  // szczegół implementacji, nie to, co widać na ekranie.
  const merged = [];
  for (const child of children) {
    if (child.nodeType === Node.TEXT_NODE) {
      const last = merged[merged.length - 1];
      if (typeof last === 'string') merged[merged.length - 1] = last + child.textContent;
      else merged.push(child.textContent);
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      merged.push(child);
    }
  }
  for (const child of merged) {
    if (typeof child === 'string') {
      const text = child.replace(/\s+/g, ' ').trim();
      if (text) lines.push(`${pad}${JSON.stringify(text)}`);
      continue;
    }
    const tag = child.tagName.toLowerCase();
    const attrs = attributesOf(child, ids).map(([name, value]) => ` ${name}=${JSON.stringify(value)}`).join('');
    if (child.childNodes.length === 0) {
      lines.push(`${pad}<${tag}${attrs} />`);
    } else {
      lines.push(`${pad}<${tag}${attrs}>`);
      render(child, depth + 1, ids, lines);
      lines.push(`${pad}</${tag}>`);
    }
  }
}

/** Zapis jednego lub kilku węzłów (np. `container` albo dzieci `document.body`). */
export function serializeDom(...roots) {
  const wrapper = document.createElement('div');
  for (const root of roots) wrapper.appendChild(root.cloneNode(true));
  const ids = new Map();
  collectGeneratedIds(wrapper, ids);
  const lines = [];
  render(wrapper, 0, ids, lines);
  return `\n${lines.join('\n')}\n`;
}

/** Wszystko, co jest teraz w `document.body` — razem z portalami (okna dialogowe). */
export function serializeBody() {
  return serializeDom(...Array.from(document.body.children));
}

/** Atrapa `matchMedia`: wskazane zapytania „pasują", reszta nie. */
export function stubMedia({ mobile = false, reducedMotion = false } = {}) {
  globalThis.matchMedia = vi.fn((query) => ({
    matches: (mobile && /max-width/.test(query)) || (reducedMotion && /prefers-reduced-motion/.test(query)),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }));
}
