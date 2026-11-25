// App logic: turns saved putts into a test run through the engine (src/engine.js),
// plus simulation, per-distance averages, the putting-pattern plot and CSV rows.
import { createTest, recordPutt, results, makeSchedule } from './engine';

export const STATIONS = 21;
export const LETTERS = ['a', 'b', 'c'];
export const LETTER_NAMES = ['A', 'B', 'C'];
export const MAX_MISS = 15;
export const HEAD_MIN = 4;
export const HEAD_MAX = 8;
export const CUP_IN = 2.125;

// `touched` is false until the putter has a click or saved data, so an untouched hole can be caught on Save.
export const blank = () => ({ lr: 0, sp: 0, made: false, touched: false });
export const zeroRow = () => ({ a: blank(), b: blank(), c: blank() });
export const fromLog = (row) => {
  const src = row || {};
  const take = (e) => (e ? { ...e, touched: true } : blank());
  return { a: take(src.a), b: take(src.b), c: take(src.c) };
};

export function lettersFor(count) {
  return count === 3 ? LETTERS : LETTERS.slice(0, 2);
}

// Putter name for index p (0..2). A blank name falls back to "Putter A" and so on.
export function nameOf(setup, p) {
  const n = (setup.names[p] || '').trim();
  return n || `Putter ${LETTER_NAMES[p]}`;
}

export function distOf(setup, i) {
  return setup.schedule ? setup.schedule[i - 1].distFt : [8, 15, 4][(i - 1) % 3];
}

export function roundOf(i) {
  return Math.floor((i - 1) / 3) + 1;
}

export function unitStep(unit) {
  return unit === 'heads' ? 1 : 0.25;
}

// Letters playing station i. With 3 putters the cut putter is out from station 10 on.
export function activeLetters(setup, i) {
  const all = lettersFor(setup.putterCount);
  if (setup.putterCount === 3 && setup.cut && i > 9) return all.filter((k) => k !== setup.cut);
  return all;
}

// Walks the first station with a missing putt. Used to resume a test.
export function firstOpenStation(setup, log) {
  for (let i = 1; i <= STATIONS; i++) {
    const row = log[i];
    if (!row || activeLetters(setup, i).some((k) => !row[k])) return i;
  }
  return STATIONS;
}

// A made putt, or a 0 and 0 reading, both count as holed (the engine does the same).
export function normalise(e) {
  if (e.made || (e.lr === 0 && e.sp === 0)) return { lr: 0, sp: 0, made: true };
  return { lr: e.lr, sp: e.sp, made: false };
}

// Replays every saved putt through the engine, so cuts and the verdict come from engine.js.
// Returns null until the setup is complete enough to build a test.
export function buildTest(setup, log) {
  if (!setup.schedule) return null;
  if (setup.unit === 'heads' && !(setup.headLen > 0)) return null;
  const letters = lettersFor(setup.putterCount);
  const test = createTest({
    putters: letters.map((_, p) => nameOf(setup, p)),
    unit: setup.unit,
    headLengthIn: setup.unit === 'heads' ? setup.headLen : undefined,
    schedule: setup.schedule,
    measuredFrom: 'edge',
  });
  for (let i = 1; i <= STATIONS; i++) {
    const row = log[i];
    if (!row) continue;
    letters.forEach((letter, p) => {
      const e = row[letter];
      if (e && test.active.includes(p)) recordPutt(test, i, p, { lr: e.lr, sp: e.sp, made: e.made });
    });
  }
  return test;
}

// Verdict, cut and status for the whole test.
export function analyse(setup, log) {
  const test = buildTest(setup, log);
  if (!test) return { complete: false, verdict: 'pending', cutLetter: null, winnerIdx: null, test: null };
  const r = results(test);
  const cutRec = test.cuts[0] || null;
  const cutLetter = cutRec ? LETTERS[cutRec.cutIdx] : null;
  let verdict = 'pending';
  let winnerIdx = null;
  if (r.complete) {
    if (r.verdict.type === 'winner') {
      verdict = 'winner';
      winnerIdx = test.putters.indexOf(r.verdict.winner);
    } else {
      verdict = 'none';
    }
  }
  return { complete: r.complete, verdict, winnerIdx, cutLetter, test };
}

// Per-putter, per-distance summary shown in the results table.
export function cellStats(setup, log, letter, ft) {
  let n = 0, made = 0, sum = 0;
  for (let i = 1; i <= STATIONS; i++) {
    const row = log[i];
    if (!row || !row[letter] || distOf(setup, i) !== ft) continue;
    const e = row[letter];
    n++;
    if (e.made) made++;
    else sum += Math.sqrt(e.lr * e.lr + e.sp * e.sp);
  }
  return { n, made, avg: n ? (sum / n).toFixed(1) : '—' };
}

// One row per saved putt. Left/right and short/past are as entered (negative = left or short).
export function buildCsv(setup, log) {
  const word = setup.unit === 'heads' ? 'putter heads' : 'inches';
  const rows = ['station,round,distance_ft,putter,unit,left_right,short_past,made'];
  const num = (v) => String(Number(v.toFixed(2)));
  for (let i = 1; i <= STATIONS; i++) {
    const row = log[i];
    if (!row) continue;
    lettersFor(setup.putterCount).forEach((letter, p) => {
      const e = row[letter];
      if (!e) return;
      rows.push([
        i, roundOf(i), distOf(setup, i), nameOf(setup, p).replace(/,/g, ' '), word,
        e.made ? 0 : num(e.lr), e.made ? 0 : num(e.sp), e.made ? 1 : 0,
      ].join(','));
    });
  }
  return rows.join('\n') + '\n';
}

// Random sample readings for the Simulate button. Values are in the chosen unit.
function sampleValue(unit) {
  const k = unit === 'inches' ? 4.25 : 1;
  const q = (v) => Math.round(v * k * 4) / 4;
  if (Math.random() < 0.15) return { lr: 0, sp: 0, made: true };
  const lr = Math.round((Math.random() + Math.random() + Math.random() - 1.5) * 4);
  const sp = Math.round((Math.random() + Math.random() - 1) * 4);
  return { lr: q(lr), sp: q(sp), made: false };
}

// Full simulated test. Stations 1-9 are played by everyone, then the cut is read from the engine.
export function simulate(setup) {
  const letters = lettersFor(setup.putterCount);
  const schedule = makeSchedule(letters.length, STATIONS);
  const log = {};
  for (let i = 1; i <= 9; i++) {
    const row = {};
    letters.forEach((k) => { row[k] = sampleValue(setup.unit); });
    log[i] = row;
  }
  // The cut must be worked out in the same units and head length the test will use,
  // or the simulated data drops the wrong putter. Heads fall back to 6 in if none is entered yet.
  let cut = null;
  if (setup.putterCount === 3) {
    const headLen = setup.unit === 'heads' ? (setup.headLen > 0 ? setup.headLen : 6) : null;
    const t = buildTest({ ...setup, headLen, schedule, cut: null }, log);
    cut = t && t.cuts[0] ? LETTERS[t.cuts[0].cutIdx] : null;
  }
  for (let i = 10; i <= STATIONS; i++) {
    const row = {};
    letters.filter((k) => k !== cut || setup.putterCount !== 3).forEach((k) => { row[k] = sampleValue(setup.unit); });
    log[i] = row;
  }
  return { schedule, log, cut };
}

// Plot geometry for the putting pattern: scale to the largest miss so putts fill the green.
export function plotScale(setup, log) {
  let maxAbs = 1;
  for (let i = 1; i <= STATIONS; i++) {
    const row = log[i];
    if (!row) continue;
    Object.values(row).forEach((e) => {
      if (!e) return;
      maxAbs = Math.max(maxAbs, Math.abs(e.lr), Math.abs(e.sp));
    });
  }
  const candidates = setup.unit === 'heads' ? [1, 2, 5, 10, 20] : [0.5, 1, 2, 5, 10];
  const ringUnit = candidates.find((c) => maxAbs / c <= 6) || candidates[candidates.length - 1];
  return { maxAbs, ringUnit, px: 120 / maxAbs };
}
