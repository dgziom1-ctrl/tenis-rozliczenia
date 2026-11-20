/** Rozbicie kosztu jednego gracza w danej sesji (w złotych). */
export interface PlayerShare {
  court: number;
  racket: number;
  total: number;
}

export interface SessionShares {
  /** Udział każdego obecnego gracza, klucz = imię. */
  byPlayer: Record<string, PlayerShare>;
  /** Ile średnio płaci obecny gracz bez karty Multisport. */
  baseCourt: number;
  /** Ile średnio płaci obecny gracz z kartą Multisport. */
  baseCourtMulti: number;
  /** Ile średnio płaci gracz z Medicoverem; `null`, gdy nikt go nie miał. */
  baseCourtSingle: number | null;
  /**
   * Zniżka za kartę nie zmieściła się w udziale gracza, więc rabat zadziałał
   * słabiej niż `MULTISPORT_DISCOUNT`. Zwykle znak, że wpisana kwota jest
   * niższa, niż powinna być przy tylu kartach.
   */
  discountCapped: boolean;
  /**
   * Liczba zaznaczonych kart przekroczyła limit obiektu (korty × godziny × limit/sport).
   * Zniżka została proporcjonalnie podzielona na wszystkich posiadaczy kart.
   */
  multiCapped: boolean;
  /** Maksymalna liczba kart honorowanych przez obiekt w tej sesji. */
  maxMulti: number;
  /**
   * Ile kart faktycznie zadziałało (≤ maxMulti). Przy `perScan` liczone
   * w odbiciach: karta MS na 2h to 2 odbicia, Medicover zawsze 1.
   */
  effectiveCards: number;
  /**
   * Kwota, której nie dało się przypisać nikomu (sesja bez obecnych graczy albo
   * rakiety, gdy każdy przyszedł z własną). Pokrywa ją organizator.
   */
  unallocated: number;
}

/** Wynik podziału samej części za kort (bez rakiet), w groszach. */
export interface CourtSplit {
  court: Map<string, number>;
  unallocatedGrosze: number;
  discountCapped: boolean;
  multiCapped: boolean;
  maxMulti: number;
  effectiveCards: number;
}

/** Rodzaj karty gracza w sesji: bez, Multisport (co godzinę) albo jednorazowa (Medicover). */
export type CardKind = 'none' | 'multi' | 'single';

/** Grupa graczy płacących w tej sesji tę samą stawkę. */
export interface ShareGroup {
  names: string[];
  hasCard: boolean;
  /** Rodzaj karty: bez, Multisport (co godzinę) albo jednorazowa (Medicover). */
  card: CardKind;
  ownRacket: boolean;
  /** Ile wypada na osobę w tej grupie — prosto z podziału sesji. */
  perPerson: number;
}
