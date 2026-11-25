// Shared test state. Saved to the phone after every change, so a test survives closing the app.
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { makeSchedule } from './engine';
import {
  STATIONS, HEAD_MIN, HEAD_MAX, MAX_MISS, LETTERS, zeroRow, fromLog,
  lettersFor, nameOf, activeLetters, firstOpenStation, normalise, buildTest,
  unitStep, simulate as simulateLog, analyse,
} from './logic';
import { exportCsvFile } from './exportCsv';

const KEY = 'putter-test:v1';

const DEFAULT = {
  names: ['', '', ''],
  putterCount: 2,
  unit: 'heads',
  headLen: null,
  schedule: null,
  simulated: false,
  log: {},
  cut: null,
  cutAcked: false,
  st: 1,
  cur: zeroRow(),
  editing: false,
  pat: 'all',
  patBack: 'setup',
  simNext: 'winner', // simulate alternates: winner first, then no winner
};

const Ctx = createContext(null);

export function TestProvider({ children }) {
  const [data, setData] = useState(null);
  // Only one pop-up is open at a time: needHead, dupNames, unitLocked, headRange, maxMiss, editConfirm, cut, export.
  const [pop, setPop] = useState(null);
  const [toast, setToast] = useState(false);

  useEffect(() => {
    // Setup fields start blank unless a test is in progress, so names and head length are kept only for that.
    const fresh = (d) => {
      const inProgress = d.simulated || Object.keys(d.log || {}).length > 0;
      return inProgress ? d : { ...d, names: ['', '', ''], headLen: null };
    };
    AsyncStorage.getItem(KEY)
      .then((raw) => setData(raw ? fresh({ ...DEFAULT, ...JSON.parse(raw) }) : fresh(DEFAULT)))
      .catch(() => setData(DEFAULT));
  }, []);

  useEffect(() => {
    if (data) AsyncStorage.setItem(KEY, JSON.stringify(data)).catch(() => {});
  }, [data]);

  if (!data) return null;

  const set = (patch) => setData({ ...data, ...patch });

  const resetTest = (d, patch = {}) => ({
    ...d, log: {}, cut: null, cutAcked: false, schedule: null, simulated: false,
    st: 1, cur: zeroRow(), editing: false, ...patch,
  });

  const setPutterCount = (n) => setData(resetTest(data, { putterCount: n }));

  const setName = (p, value) => {
    const names = data.names.slice();
    names[p] = value.slice(0, 10);
    set({ names });
  };

  const setUnit = (unit) => {
    if (unit === data.unit) return;
    const hasRealData = !data.simulated && Object.keys(data.log).length > 0;
    if (hasRealData) { setPop('unitLocked'); return; }
    setData(resetTest(data, { unit }));
  };

  const checkHeadLength = (text) => {
    if (text === '' || text == null) return;
    const v = parseFloat(text);
    if (isNaN(v) || v < HEAD_MIN || v > HEAD_MAX) { setPop('headRange'); return; }
    // Simulated data depends on head length, so a change clears it rather than leaving a stale cut.
    if (data.simulated && v !== data.headLen) { setData(resetTest(data, { headLen: v })); return; }
    set({ headLen: v });
  };

  const namesOk = () => {
    const names = lettersFor(data.putterCount).map((_, p) => nameOf(data, p).toLowerCase());
    return new Set(names).size === names.length;
  };

  // Start a new test (or reopen the simulated one). Returns true when the entry screen can open.
  const start = () => {
    if (data.unit === 'heads' && !data.headLen) { setPop('needHead'); return false; }
    if (!namesOk()) { setPop('dupNames'); return false; }
    if (data.simulated) {
      setData({ ...data, st: 1, cur: fromLog(data.log[1]), editing: true });
    } else {
      setData(resetTest(data, {
        schedule: makeSchedule(lettersFor(data.putterCount).length, STATIONS),
        st: 1, cur: zeroRow(),
      }));
    }
    return true;
  };

  // Each press alternates between a winner and no winner. Random runs are retried until one matches.
  const runSimulate = () => {
    const wantWinner = data.simNext !== 'none';
    let sim = null;
    const headLen = data.unit === 'heads' ? (data.headLen > 0 ? data.headLen : 6) : null;
    for (let i = 0; i < 2000; i += 1) {
      sim = simulateLog(data);
      const v = analyse({ ...data, headLen, schedule: sim.schedule, cut: sim.cut }, sim.log).verdict;
      if (wantWinner ? v === 'winner' : v === 'none') break;
    }
    setData({
      ...data, simulated: true, simNext: wantWinner ? 'none' : 'winner',
      schedule: sim.schedule, log: sim.log, cut: sim.cut,
      cutAcked: false, st: 1, cur: fromLog(sim.log[1]), editing: false,
    });
  };

  // Resume an unfinished test at its first open station.
  const resume = () => {
    const st = firstOpenStation(data, data.log);
    setData({ ...data, st, cur: data.log[st] ? fromLog(data.log[st]) : zeroRow(), editing: !!data.log[st] });
    return data.log[STATIONS] ? 'pattern' : 'entry';
  };

  const pickStation = (n) => {
    setData({ ...data, st: n, cur: data.log[n] ? fromLog(data.log[n]) : zeroRow(), editing: !!data.log[n] });
  };

  const bump = (letter, field, dir) => {
    const old = data.cur[letter];
    const raw = Math.round((old[field] + dir * unitStep(data.unit)) * 100) / 100;
    let value = raw;
    if (Math.abs(raw) > MAX_MISS) {
      setPop('maxMiss');
      value = Math.sign(raw) * MAX_MISS;
    }
    const next = { ...old, [field]: value, made: false };
    // Back at 0 and 0 is not an entry: the putter still needs deliberate data.
    next.touched = next.lr !== 0 || next.sp !== 0;
    set({ cur: { ...data.cur, [letter]: next } });
  };

  const toggleMade = (letter) => {
    const was = data.cur[letter].made;
    set({ cur: { ...data.cur, [letter]: { lr: 0, sp: 0, made: !was, touched: !was } } });
  };

  // Returns 'next', 'finished' or 'confirm' (a pop-up is asking first).
  const doSave = () => {
    const d = data;
    const letters = activeLetters(d, d.st);
    const entry = {};
    letters.forEach((k) => { entry[k] = normalise(d.cur[k]); });
    const log = { ...d.log, [d.st]: entry };

    let cut = d.cut;
    let cutAcked = d.cutAcked;
    let showCut = false;
    if (d.putterCount === 3 && [1, 2, 3, 4, 5, 6, 7, 8, 9].every((i) => log[i])) {
      const t = buildTest(d, log);
      const newCut = t && t.cuts[0] ? LETTERS[t.cuts[0].cutIdx] : null;
      if (newCut) {
        const changed = newCut !== d.cut;
        if (changed) Object.keys(log).forEach((k) => { if (Number(k) > 9) delete log[k]; });
        showCut = changed || (d.st === 9 && !d.cutAcked);
        cut = newCut;
        cutAcked = d.cutAcked || showCut;
      }
    }

    const finished = d.st === STATIONS;
    const next = finished ? d.st : d.st + 1;
    setData({
      ...d, log, cut, cutAcked,
      st: next,
      cur: finished ? d.cur : (log[next] ? fromLog(log[next]) : zeroRow()),
      editing: finished ? false : !!log[next],
      patBack: 'verdict',
    });
    if (d.editing) {
      setToast(true);
      setTimeout(() => setToast(false), 1800);
    }
    if (showCut) setPop('cut');
    return finished ? 'finished' : 'next';
  };

  const save = () => {
    const untouched = activeLetters(data, data.st).some((k) => !data.cur[k].touched);
    if (untouched) { setPop('noData'); return 'blocked'; }
    const later = Object.keys(data.log).some((k) => Number(k) > 9);
    if (data.putterCount === 3 && data.st <= 9 && later) { setPop('editConfirm'); return 'confirm'; }
    return doSave();
  };

  const confirmSave = () => {
    setPop(null);
    return doSave();
  };

  const confirmExport = async () => {
    setPop(null);
    await exportCsvFile(data, data.log);
  };

  const goPattern = (from) => set({ pat: 'all', patBack: from });

  const editData = () => {
    setData({ ...data, st: STATIONS, cur: fromLog(data.log[STATIONS]), editing: !!data.log[STATIONS] });
  };

  const hasData = Object.keys(data.log).length > 0;

  const value = {
    d: data,
    pop, setPop,
    toast,
    setPutterCount, setName, setUnit, checkHeadLength,
    start, runSimulate, resume, pickStation,
    bump, toggleMade,
    save, confirmSave,
    setPat: (pat) => set({ pat }),
    goPattern, editData, hasData,
    closePop: () => setPop(null),
    cancelPop: () => setPop(null),
    openExport: () => setPop('export'),
    confirmExport,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTest() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTest must be used inside TestProvider');
  return v;
}
