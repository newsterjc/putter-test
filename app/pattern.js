import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTest } from '../src/TestContext';
import { Btn, Chip, Link } from '../src/ui';
import Pops from '../src/Pops';
import { C } from '../src/theme';
import {
  STATIONS, LETTERS, cellStats, nameOf, analyse, plotScale,
} from '../src/logic';

const PLOT = 260;
const HALF = PLOT / 2;
const DOT_COLOUR = { a: C.dotA, b: C.dotB, c: C.dotC };

// Putting pattern and results: plot, verdict, averages by distance, and export.
export default function Pattern() {
  const t = useTest();
  const { d } = t;
  const insets = useSafeAreaInsets();

  const letters = d.putterCount === 3 ? LETTERS : LETTERS.slice(0, 2);
  const shown = d.pat === 'all' ? letters : [d.pat];
  const unitShort = d.unit === 'heads' ? 'heads' : 'in';
  const noData = Object.keys(d.log).length === 0;
  const cutOn = d.putterCount === 3 && !!d.cut;
  const cutName = cutOn ? nameOf(d, LETTERS.indexOf(d.cut)) : null;

  const v = analyse(d, d.log);
  const verdictTitle = v.verdict === 'winner'
    ? `${nameOf(d, v.winnerIdx)} wins`
    : v.verdict === 'none' ? 'No clear winner this time' : 'Incomplete Data';
  const verdictBox = v.verdict === 'winner'
    ? { backgroundColor: C.winBg, borderColor: C.green }
    : v.verdict === 'none' ? { backgroundColor: C.noBg, borderColor: C.noHead }
    : { backgroundColor: C.pendBg, borderColor: C.pendHead };
  const verdictHead = v.verdict === 'winner'
    ? { backgroundColor: C.green }
    : v.verdict === 'none' ? { backgroundColor: C.noHead } : { backgroundColor: C.pendHead };

  // Plot
  const { ringUnit, px, maxAbs } = plotScale(d, d.log);
  const rings = [];
  for (let k = 1; k <= 8; k++) {
    const val = k * ringUnit;
    if (val > maxAbs + 1e-9) break;
    const r = val * px;
    rings.push({ key: k, r, label: String(Number(val.toFixed(2))) });
  }
  const dots = [];
  const madeCount = {};
  shown.forEach((k) => { madeCount[k] = 0; });
  for (let i = 1; i <= STATIONS; i++) {
    const row = d.log[i];
    if (!row) continue;
    shown.forEach((k) => {
      const e = row[k];
      if (!e) return;
      if (e.made) { madeCount[k] += 1; return; }
      dots.push({
        key: `${i}-${k}`,
        colour: DOT_COLOUR[k],
        x: HALF + e.lr * px - 9,
        y: HALF - e.sp * px - 9,
      });
    });
  }
  const madeKeys = shown.filter((k) => madeCount[k] > 0);

  const ringNote = d.unit === 'heads'
    ? `Each ring = ${String(Number(ringUnit.toFixed(2)))} putter ${ringUnit === 1 ? 'head' : 'heads'}`
    : `Each ring = ${String(Number(ringUnit.toFixed(2)))} in`;

  const onBack = () => router.back();
  const onEdit = () => { t.editData(); router.push('/entry'); };
  const onNewTest = () => router.navigate('/');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 10 }]}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>PUTTING PATTERN</Text>
        {d.patBack !== 'verdict' ? <Link label="← Back" onPress={onBack} style={styles.back} /> : null}
      </View>

      <View style={styles.row}>
        <Chip label="All" on={d.pat === 'all'} onPress={() => t.setPat('all')} style={styles.flex} />
        {letters.map((k) => (
          <Chip
            key={k}
            label={nameOf(d, LETTERS.indexOf(k))}
            on={d.pat === k}
            onPress={() => t.setPat(k)}
            style={styles.flex}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.target}>
          {rings.map((rg) => (
            <View
              key={rg.key}
              style={[styles.ring, { left: HALF - rg.r, top: HALF - rg.r, width: 2 * rg.r, height: 2 * rg.r }]}
            />
          ))}
          {rings.map((rg) => (
            <Text key={`l${rg.key}`} style={[styles.ringLabel, { top: HALF - rg.r - 6 }]}>{rg.label}</Text>
          ))}
          <View style={styles.hub} />
          {dots.map((dot) => (
            <View
              key={dot.key}
              style={[styles.dot, { left: dot.x, top: dot.y, backgroundColor: dot.colour }]}
            />
          ))}
          {madeKeys.map((k, idx) => {
            const cx = HALF + (idx - (madeKeys.length - 1) / 2) * 28;
            return (
              <View key={`m${k}`} style={[styles.holed, { left: cx - 13, top: HALF - 13 }]}>
                <Text style={styles.holedText}>{String(madeCount[k])}</Text>
              </View>
            );
          })}
        </View>

        <Text style={styles.note}>{ringNote}</Text>
        <View style={styles.legend}>
          {letters.map((k) => (
            <View key={k} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: DOT_COLOUR[k] }]} />
              <Text style={styles.legendText}>{nameOf(d, LETTERS.indexOf(k))}</Text>
            </View>
          ))}
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: C.holed }]} />
          <Text style={styles.legendText}>Green number = holed putts</Text>
        </View>

        <View style={[styles.verdict, verdictBox]}>
          <View style={[styles.verdictTitle, verdictHead]}>
            <Text style={styles.verdictTitleText}>{verdictTitle}</Text>
          </View>
          <Text style={styles.cap}>{`Average miss in ${unitShort}`}</Text>

          <View style={styles.tableHead}>
            <View style={styles.rowTitleSpacer} />
            {letters.map((k) => (
              <Text key={k} style={styles.tableCell} numberOfLines={1}>{nameOf(d, LETTERS.indexOf(k))}</Text>
            ))}
          </View>
          {[4, 8, 15].map((ft) => (
            <View key={ft} style={styles.tableRow}>
              <Text style={styles.rowTitle}>{`${ft} ft`}</Text>
              {letters.map((k) => {
                const s = cellStats(d, d.log, k, ft);
                const isWinner = v.verdict === 'winner' && LETTERS.indexOf(k) === v.winnerIdx;
                return (
                  <View key={k} style={styles.tableCell}>
                    <Text style={styles.cellTop}>{`${isWinner ? '★ ' : ''}Average ${s.avg}`}</Text>
                    <Text style={styles.cellSub}>{`${s.made} of ${s.n} made`}</Text>
                  </View>
                );
              })}
            </View>
          ))}

          {cutOn ? <Text style={styles.cap}>{`Putter ${cutName} was eliminated after Station 9.`}</Text> : null}

          {noData ? (
            <Btn label="Fill in simulated results" onPress={t.runSimulate} style={styles.simBtn} textStyle={styles.bottomText} />
          ) : null}

          <View style={styles.row}>
            <Btn label={'Export\n.csv (beta)'} onPress={t.openExport} style={styles.actionBtn} textStyle={styles.smallBtn} />
            <Btn label={'Edit\ndata'} onPress={onEdit} style={styles.actionBtn} textStyle={styles.smallBtn} />
            <Btn label={'New\ntest'} onPress={onNewTest} style={styles.actionBtn} textStyle={styles.smallBtn} />
          </View>
        </View>

      </ScrollView>

      <Pops keys={['export']} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 18, gap: 6 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  eyebrow: { fontSize: 13, fontWeight: '800', letterSpacing: 0.6, color: C.green },
  back: { fontSize: 15 },
  row: { flexDirection: 'row', gap: 6 },
  flex: { flex: 1 },
  scroll: { gap: 6, paddingBottom: 12, alignItems: 'center' },
  target: {
    width: PLOT, height: PLOT, borderRadius: HALF, backgroundColor: C.target,
    borderWidth: 4, borderColor: C.targetBorder, overflow: 'hidden', marginTop: 6,
  },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.65)' },
  ringLabel: { position: 'absolute', left: HALF - 3, color: C.card, fontSize: 11, fontWeight: '700', lineHeight: 12 },
  hub: { position: 'absolute', left: HALF - 7, top: HALF - 7, width: 14, height: 14, borderRadius: 7, backgroundColor: C.ink },
  dot: {
    position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: C.card,
  },
  holed: {
    position: 'absolute', width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: C.card,
    backgroundColor: C.holed, alignItems: 'center', justifyContent: 'center',
  },
  holedText: { color: C.card, fontSize: 12, fontWeight: '800' },
  note: { fontSize: 12, fontWeight: '700', color: C.ink, alignSelf: 'flex-end' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignSelf: 'flex-start' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  legendDot: { width: 14, height: 14, borderRadius: 7 },
  legendText: { fontSize: 13, color: C.ink },
  verdict: { width: '100%', borderWidth: 2, borderRadius: 14, padding: 10, gap: 6 },
  verdictTitle: { borderRadius: 10, paddingVertical: 6, paddingHorizontal: 10 },
  verdictTitleText: { fontSize: 20, lineHeight: 24, fontWeight: '800', color: C.card },
  cap: { fontSize: 12, color: C.muted },
  tableHead: { flexDirection: 'row', paddingHorizontal: 8 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.line, padding: 6,
  },
  tableCell: { flex: 1, textAlign: 'center', fontSize: 12, fontWeight: '700', color: C.ink },
  rowTitle: { width: 50, fontSize: 14, fontWeight: '700', color: C.ink },
  rowTitleSpacer: { width: 50 },
  cellTop: { fontSize: 13, fontWeight: '700', color: C.ink, textAlign: 'center' },
  cellSub: { fontSize: 12, color: C.ink, textAlign: 'center' },
  simBtn: { backgroundColor: C.card, minHeight: 44 },
  bottomText: { fontSize: 15 },
  actionBtn: { flex: 1, minHeight: 58, paddingHorizontal: 2, backgroundColor: C.card },
  smallBtn: { fontSize: 13, lineHeight: 17, textAlign: 'center' },
});
