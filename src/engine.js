/*
 * Putter Decision Test — calculation engine (single source of truth).
 * Copied unchanged from project doc claude/app-engine/engine.js for scenario generation.
 */
'use strict';

const CUP_RADIUS_IN = 2.125;
const DISTANCES_FT = [4, 8, 15];

const DEFAULTS = {
  nStations: 21,
  alphaFinal: 0.10,
  alphaInterim: 0.01,
  // Early stops are off for now. Set to [12, 15] to turn them back on.
  interimAt: [],
  cutsAfter: { 2: [], 3: [9], 4: [6, 12] },
};

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function averageRanks(values) {
  const idx = values.map((v, i) => i).sort((i, j) => values[i] - values[j]);
  const ranks = new Array(values.length);
  let k = 0;
  while (k < idx.length) {
    let m = k;
    while (m + 1 < idx.length && values[idx[m + 1]] === values[idx[k]]) m++;
    const r = (k + m + 2) / 2;
    for (let q = k; q <= m; q++) ranks[idx[q]] = r;
    k = m + 1;
  }
  return ranks;
}

function round(x, dp) {
  const f = Math.pow(10, dp);
  return Math.round(x * f) / f;
}

function median(xs) {
  if (!xs.length) return null;
  const s = xs.slice().sort((a, b) => a - b);
  const n = s.length;
  return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2;
}

function wilcoxonPratt(d) {
  const EPS = 1e-12;
  const clean = d.map((v) => (Math.abs(v) < EPS ? 0 : v));
  const n = clean.length;
  const nZero = clean.filter((v) => v === 0).length;
  if (n === 0 || nZero === n) {
    return { n, nZero, wPlus: 0, wMinus: 0, p: 1, direction: 0 };
  }
  const ranks = averageRanks(clean.map(Math.abs));
  const nz = [];
  let wPlus = 0, wMinus = 0;
  clean.forEach((v, i) => {
    if (v === 0) return;
    nz.push(ranks[i]);
    if (v > 0) wPlus += ranks[i]; else wMinus += ranks[i];
  });
  const units = nz.map((r) => Math.round(r * 2));
  const total = units.reduce((a, b) => a + b, 0);
  let dist = new Float64Array(total + 1);
  dist[0] = 1;
  let maxSoFar = 0;
  for (const u of units) {
    const next = new Float64Array(total + 1);
    for (let s = 0; s <= maxSoFar; s++) {
      if (dist[s] === 0) continue;
      next[s] += dist[s] * 0.5;
      next[s + u] += dist[s] * 0.5;
    }
    maxSoFar += u;
    dist = next;
  }
  const mean = total / 2;
  const obs = Math.round(wPlus * 2);
  const dev = Math.abs(obs - mean);
  let p = 0;
  for (let s = 0; s <= total; s++) {
    if (Math.abs(s - mean) >= dev - 1e-9) p += dist[s];
  }
  p = Math.min(1, p);
  const direction = wPlus > wMinus ? 1 : wPlus < wMinus ? -1 : 0;
  return { n, nZero, wPlus, wMinus, p, direction };
}

function standardizedEffect(d) {
  const n = d.length;
  if (n < 2) return null;
  const m = d.reduce((a, b) => a + b, 0) / n;
  const v = d.reduce((a, b) => a + (b - m) * (b - m), 0) / (n - 1);
  return v > 0 ? m / Math.sqrt(v) : null;
}

function makeSchedule(nPutters, nStations, seed) {
  const rand = mulberry32(seed == null ? Date.now() : seed);
  const stations = [];
  const nRounds = Math.ceil(nStations / 3);
  for (let r = 0; r < nRounds; r++) {
    const dists = shuffle(DISTANCES_FT, rand);
    for (const d of dists) {
      if (stations.length < nStations) stations.push({ round: r + 1, distFt: d });
    }
  }
  const ids = [...Array(nPutters).keys()];
  if (nPutters === 2) {
    const firstA = Math.ceil(nStations / 2);
    const flags = shuffle(stations.map((_, i) => i < firstA), rand);
    stations.forEach((s, i) => { s.order = flags[i] ? [0, 1] : [1, 0]; });
  } else {
    stations.forEach((s) => { s.order = shuffle(ids, rand); });
  }
  stations.forEach((s, i) => { s.station = i + 1; });
  return stations;
}

function createTest(opts) {
  const cfg = Object.assign({}, DEFAULTS, opts.config || {});
  const nStations = opts.nStations || cfg.nStations;
  const nP = opts.putters.length;
  if (nP < 2 || nP > 4) throw new Error('2 to 4 putters');
  if (opts.unit === 'heads' && !(opts.headLengthIn > 0)) {
    throw new Error('Head length (in) is required when measuring in heads');
  }
  const schedule = opts.schedule
    ? opts.schedule.map((s, i) => Object.assign({ station: i + 1 }, s))
    : makeSchedule(nP, nStations, opts.seed);
  return {
    putters: opts.putters.slice(),
    unit: opts.unit,
    measuredFrom: opts.measuredFrom || 'edge',
    headLengthIn: opts.unit === 'heads' ? opts.headLengthIn : 1,
    nStations,
    cfg,
    cutsAfter: (opts.cutsAfter || cfg.cutsAfter[nP] || []).slice(),
    schedule,
    putts: schedule.map(() => ({})),
    active: [...Array(nP).keys()],
    cuts: [],
    interim: [],
    stopped: null,
    notes: [],
  };
}

function toInches(test, v) { return v * test.headLengthIn; }

function recordPutt(test, station, putterIdx, entry) {
  const si = station - 1;
  if (!test.active.includes(putterIdx)) throw new Error(`${test.putters[putterIdx]} is out`);
  const flags = [];
  let lr = 0, sp = 0, made = false;
  if (entry.made) { made = true; }
  else {
    if (entry.lr == null) flags.push('L/R missing, counted as 0'); else lr = entry.lr;
    if (entry.sp == null) flags.push('S/P missing, counted as 0'); else sp = entry.sp;
    if (lr === 0 && sp === 0 && !flags.length) made = true;
  }
  const raw = { lr, sp };
  if (!made && test.measuredFrom === 'edge') {
    const r = Math.hypot(lr, sp);
    const cupR = CUP_RADIUS_IN / test.headLengthIn;
    if (r > 0) { const k = (r + cupR) / r; lr *= k; sp *= k; }
  }
  test.putts[si][putterIdx] = { lr, sp, made, flags, raw };
  if (flags.length) test.notes.push(`Station ${station}, ${test.putters[putterIdx]}: ${flags.join('; ')}`);
  return afterEntry(test, station);
}

function stationComplete(test, station) {
  const row = test.putts[station - 1];
  return test.active.every((p) => row[p]);
}

function afterEntry(test, station) {
  if (!stationComplete(test, station)) return { stationComplete: false };
  const events = [];
  if (test.cutsAfter.includes(station) && test.active.length > 2) {
    const c = applyCut(test, station);
    events.push({ type: 'cut', ...c });
  }
  if (test.active.length === 2 && !test.stopped && test.cfg.interimAt.includes(station) && station < test.nStations) {
    const v = pairTest(test, station);
    const stop = v.p < test.cfg.alphaInterim;
    test.interim.push({ afterStation: station, p: v.p, stopped: stop });
    if (stop) {
      test.stopped = { afterStation: station, winner: v.winner };
      events.push({ type: 'earlyStop', afterStation: station, winner: test.putters[v.winner], p: v.p });
    } else {
      events.push({ type: 'interim', afterStation: station, p: v.p });
    }
  }
  return { stationComplete: true, events };
}

function closeness(putt) { return Math.abs(putt.lr) + Math.abs(putt.sp); }
function radialIn(test, putt) { return toInches(test, Math.hypot(putt.lr, putt.sp)); }

function rankTotals(test, uptoStation, among) {
  const totals = {}; const closeSum = {};
  among.forEach((p) => { totals[p] = 0; closeSum[p] = 0; });
  for (let s = 0; s < uptoStation; s++) {
    const row = test.putts[s];
    const present = test.putters.map((_, p) => p).filter((p) => row[p]);
    if (present.length < 2) continue;
    const ranks = averageRanks(present.map((p) => closeness(row[p])));
    present.forEach((p, i) => {
      if (p in totals) { totals[p] += ranks[i]; closeSum[p] += closeness(row[p]); }
    });
  }
  return { totals, closeSum };
}

function applyCut(test, station) {
  const among = test.active.slice();
  const { totals, closeSum } = rankTotals(test, station, among);
  let worst = among[0];
  let tieNote = null;
  for (const p of among.slice(1)) {
    if (totals[p] > totals[worst]) worst = p;
    else if (totals[p] === totals[worst]) {
      if (closeSum[p] > closeSum[worst]) worst = p;
      else if (closeSum[p] === closeSum[worst]) { worst = p; tieNote = 'Exact tie on rank points and total miss; later-listed putter cut'; }
    }
  }
  test.active = among.filter((p) => p !== worst);
  const named = {};
  among.forEach((p) => { named[test.putters[p]] = totals[p]; });
  const rec = { afterStation: station, cut: test.putters[worst], cutIdx: worst, totals: named, tieNote };
  test.cuts.push(rec);
  return rec;
}

function pairDiffs(test, uptoStation) {
  const [x, y] = test.active;
  const d = [];
  for (let s = 0; s < uptoStation; s++) {
    const row = test.putts[s];
    if (row[x] && row[y]) {
      const ft = test.schedule[s].distFt;
      d.push(radialIn(test, row[x]) / ft - radialIn(test, row[y]) / ft);
    }
  }
  return d;
}

function pairTest(test, uptoStation) {
  const [x, y] = test.active;
  const d = pairDiffs(test, uptoStation);
  const w = wilcoxonPratt(d);
  const winner = w.direction < 0 ? x : w.direction > 0 ? y : null;
  return { ...w, winner, effect: standardizedEffect(d), shared: d.length };
}

function summarize(test, p) {
  const rows = test.putts.map((row, s) => ({ putt: row[p], ft: test.schedule[s].distFt })).filter((r) => r.putt);
  const centre = rows.map((r) => radialIn(test, r.putt));
  const edge = rows.map((r) => (r.putt.made ? 0 : Math.max(0, radialIn(test, r.putt) - CUP_RADIUS_IN)));
  const perFt = rows.map((r) => radialIn(test, r.putt) / r.ft);
  const mean = (a) => (a.length ? a.reduce((u, v) => u + v, 0) / a.length : null);
  return {
    putter: test.putters[p],
    putts: rows.length,
    made: rows.filter((r) => r.putt.made).length,
    meanMissIn: mean(centre),
    medianMissIn: median(centre),
    meanEdgeMissIn: mean(edge),
    meanInPerFt: mean(perFt),
  };
}

function results(test) {
  const last = test.stopped ? test.stopped.afterStation : test.nStations;
  const done = test.stopped || test.putts.slice(0, test.nStations).every((_, s) => stationComplete(test, s + 1));
  const v = pairTest(test, last);
  let verdict;
  if (test.stopped) verdict = { type: 'winner', winner: test.putters[test.stopped.winner], early: true, afterStation: last };
  else if (v.p < test.cfg.alphaFinal && v.winner != null) verdict = { type: 'winner', winner: test.putters[v.winner], early: false };
  else verdict = { type: 'noClearWinner' };
  return {
    complete: !!done,
    verdict,
    finalPair: test.active.map((p) => test.putters[p]),
    p: v.p,
    sharedStations: v.shared,
    zeroPairs: v.nZero,
    effect: v.effect,
    cuts: test.cuts.map(({ cutIdx, ...c }) => c),
    interim: test.interim,
    putters: test.putters.map((_, p) => summarize(test, p)),
    notes: test.notes,
  };
}

module.exports = {
  CUP_RADIUS_IN, DISTANCES_FT, DEFAULTS,
  mulberry32, averageRanks, wilcoxonPratt, standardizedEffect,
  makeSchedule, createTest, recordPutt, results, round,
};
