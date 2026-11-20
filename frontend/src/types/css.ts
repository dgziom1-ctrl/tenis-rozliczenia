import type { CSSProperties } from 'react';

/**
 * Styl inline, który poza zwykłymi właściwościami CSS może przekazywać
 * własne zmienne (`--dur`, `--drift`, …). `CSSProperties` samo w sobie ich
 * nie dopuszcza, a używamy ich do sterowania animacjami z JS.
 */
export type StyleWithVars = CSSProperties & Record<`--${string}`, string | number>;
