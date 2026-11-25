import React, { useEffect, useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTest } from '../src/TestContext';
import { Btn, Chip, Link } from '../src/ui';
import Pops from '../src/Pops';
import { C } from '../src/theme';
import {
  STATIONS, activeLetters, distOf, roundOf, nameOf, LETTERS,
} from '../src/logic';

// Station screen: enter Left/Right and Short/Past for each putter, then Save.
export default function Entry() {
  const t = useTest();
  const { d } = t;
  const insets = useSafeAreaInsets();
  const [help, setHelp] = useState(false);
  const stripRef = useRef(null);

  const unit = d.unit;
  const unitLabel = unit === 'heads' ? 'Putter heads' : 'Inches';
  const doneCount = Object.keys(d.log).length;
  const letters = activeLetters(d, d.st);
  const cutName = d.cut ? nameOf(d, LETTERS.indexOf(d.cut)) : null;
  const cutOn = d.putterCount === 3 && !!d.cut;

  // Keep the current station visible in the strip.
  useEffect(() => {
    if (stripRef.current) stripRef.current.scrollTo({ x: Math.max(0, (d.st - 3) * 46), animated: true });
  }, [d.st]);

  const fmt = (v) => {
    const x = Math.abs(v);
    return unit === 'heads' ? String(x) : String(Number(x.toFixed(2)));
  };
  const lrText = (v) => (v === 0 ? 'Center' : v < 0 ? `${fmt(v)} L` : `${fmt(v)} R`);
  const spText = (v) => (v === 0 ? 'On line' : v < 0 ? `${fmt(v)} S` : `${fmt(v)} P`);

  const afterSave = (r) => {
    if (r === 'finished') router.replace('/pattern');
  };

  const onSave = () => afterSave(t.save());

  const onBack = () => t.pickStation(Math.max(1, d.st - 1));

  const saveLabel = d.editing
    ? 'Save changes'
    : d.st === STATIONS ? 'Save and see results' : 'Save and next';

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 8 }]}>
      <Link label="← Back to setup" onPress={() => router.navigate('/')} style={styles.back} />

      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.h1}>{`Station ${d.st} of ${STATIONS}`}</Text>
          <Text style={styles.line}>
            {`Round ${roundOf(d.st)} `}
            <Text style={styles.distPill}>{`${distOf(d, d.st)} ft`}</Text>
          </Text>
          <Text style={styles.line}>{`Units = ${unitLabel}`}</Text>
        </View>
        <Btn label="Help ?" onPress={() => setHelp(true)} style={styles.helpBtn} textStyle={styles.helpText} />
      </View>

      <View style={styles.track}>
        <View style={[styles.fill, { width: `${(doneCount / STATIONS) * 100}%` }]} />
      </View>
      <Text style={styles.line}>
        {d.simulated ? `${doneCount} of ${STATIONS} simulated` : `${doneCount} of ${STATIONS} saved on this phone`}
      </Text>

      <ScrollView ref={stripRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
        {Array.from({ length: STATIONS }, (_, k) => k + 1).map((i) => (
          <Chip
            key={i}
            label={`${d.log[i] ? '✓' : ''}${i}`}
            on={i === d.st}
            onPress={() => t.pickStation(i)}
            style={styles.stripChip}
          />
        ))}
      </ScrollView>

      {cutOn ? (
        <View style={styles.note}>
          <Text style={styles.noteText}>{`Putter ${cutName} is out after station 9.`}</Text>
        </View>
      ) : null}
      {d.editing ? (
        <View style={styles.warn}>
          <Text style={styles.warnText}>Click Save to update result</Text>
        </View>
      ) : null}

      <ScrollView style={styles.cardScroll} contentContainerStyle={styles.cards} showsVerticalScrollIndicator={false}>
        {letters.map((letter) => {
          const p = LETTERS.indexOf(letter);
          const cur = d.cur[letter];
          return (
            <View key={letter} style={styles.card}>
              <Text style={styles.cardName} numberOfLines={1}>{nameOf(d, p)}</Text>
              <Text style={styles.cap}>Left / right</Text>
              <Text style={styles.val} numberOfLines={1}>{lrText(cur.lr)}</Text>
              <View style={styles.row}>
                <Btn label="Left" style={styles.step} textStyle={styles.stepText} onPress={() => t.bump(letter, 'lr', -1)} />
                <Btn label="Right" style={styles.step} textStyle={styles.stepText} onPress={() => t.bump(letter, 'lr', 1)} />
              </View>
              <Text style={styles.cap}>Short / past</Text>
              <Text style={styles.val} numberOfLines={1}>{spText(cur.sp)}</Text>
              <View style={styles.row}>
                <Btn label="Short" style={styles.step} textStyle={styles.stepText} onPress={() => t.bump(letter, 'sp', -1)} />
                <Btn label="Past" style={styles.step} textStyle={styles.stepText} onPress={() => t.bump(letter, 'sp', 1)} />
              </View>
              <View style={styles.spacer} />
              <Btn
                primary={cur.made}
                label={cur.made ? 'Made ✓\n(saved as 0 and 0)' : 'Made it\n(holed out)'}
                style={styles.madeBtn}
                textStyle={[styles.madeText, cur.made && styles.madeTextOn]}
                onPress={() => t.toggleMade(letter)}
              />
            </View>
          );
        })}
      </ScrollView>

      <View style={styles.row}>
        <Btn label="Back one station" style={styles.flex} textStyle={styles.bottomText} onPress={onBack} />
        <Btn primary label={saveLabel} style={[styles.flex, styles.saveBtn]} textStyle={styles.bottomText} onPress={onSave} />
      </View>

      <Pops keys={['editConfirm', 'cut', 'maxMiss']} />

      <Modal transparent animationType="slide" visible={help} onRequestClose={() => setHelp(false)}>
        <View style={styles.helpOverlay}>
          <View style={styles.helpSheet}>
            <Text style={styles.helpTitle}>What do the letters mean?</Text>
            <Text style={styles.helpSmall}>Units = putter heads or inches</Text>
            <Text style={styles.helpBody}>
              <Text style={styles.bold}>L and R</Text>
              {' show how far the ball finished left (L) or right (R) of the edge of the hole.'}
            </Text>
            <Text style={styles.helpBody}>
              <Text style={styles.bold}>S and P</Text>
              {' show how far short (S) or past (P) the edge of the hole it finished.'}
            </Text>
            <Text style={styles.helpBody}>
              <Text style={styles.bold}>Made</Text>
              {' means holed out. That enters a zero (0) in the data.'}
            </Text>
            <Text style={styles.helpExample}>
              {'Example: 1 L, 2 P means one unit left and two units past. Each press moves one putter head, or a quarter inch if you chose inches.'}
            </Text>
            <Btn primary label="Got it" onPress={() => setHelp(false)} />
          </View>
        </View>
      </Modal>

      {t.toast ? (
        <View style={[styles.toast, { top: insets.top + 56 }]}>
          <Text style={styles.toastText}>Changes saved to this phone ✓</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 14, gap: 8 },
  back: { fontSize: 15, alignSelf: 'flex-start' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  headerText: { flex: 1, gap: 2 },
  h1: { fontSize: 24, lineHeight: 27, fontWeight: '800', color: C.ink },
  line: { fontSize: 15, color: C.ink },
  distPill: {
    backgroundColor: C.ink, color: C.card, fontWeight: '800', paddingHorizontal: 8, borderRadius: 8,
  },
  helpBtn: { minHeight: 44, minWidth: 44, paddingHorizontal: 10, backgroundColor: C.card },
  helpText: { fontSize: 15 },
  track: { height: 10, backgroundColor: C.track, borderRadius: 6, overflow: 'hidden' },
  fill: { height: 10, backgroundColor: C.green },
  strip: { gap: 4, paddingVertical: 2 },
  stripChip: { width: 42, minWidth: 42, paddingHorizontal: 0 },
  note: { backgroundColor: C.note, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10 },
  noteText: { fontSize: 14, color: C.ink },
  warn: {
    backgroundColor: C.warnBg, borderWidth: 2, borderColor: C.warnBorder, borderRadius: 12,
    paddingVertical: 6, paddingHorizontal: 10,
  },
  warnText: { fontSize: 14, fontWeight: '700', color: C.ink },
  cardScroll: { flex: 1, minHeight: 0 },
  cards: { flexDirection: 'row', gap: 6, paddingBottom: 4 },
  card: {
    flex: 1, minWidth: 0, backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.line,
    padding: 10, gap: 6,
  },
  cardName: { fontSize: 16, fontWeight: '800', color: C.ink },
  cap: { fontSize: 14, color: C.muted },
  val: { fontSize: 20, fontWeight: '800', color: C.ink },
  row: { flexDirection: 'row', gap: 6 },
  step: { flex: 1, minHeight: 46, borderRadius: 12, paddingHorizontal: 0, backgroundColor: C.card },
  stepText: { fontSize: 14 },
  spacer: { flex: 1 },
  madeBtn: { minHeight: 50, paddingHorizontal: 4 },
  madeText: { fontSize: 13 },
  madeTextOn: { color: C.card },
  flex: { flex: 1 },
  saveBtn: { flex: 1.2 },
  bottomText: { fontSize: 15 },
  bold: { fontWeight: '800' },
  helpOverlay: { flex: 1, backgroundColor: 'rgba(27,42,34,0.55)', justifyContent: 'flex-end' },
  helpSheet: {
    backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 22, gap: 12,
  },
  helpTitle: { fontSize: 22, fontWeight: '800', color: C.ink },
  helpSmall: { fontSize: 14, color: C.muted },
  helpBody: { fontSize: 16, lineHeight: 22, color: C.ink },
  helpExample: {
    fontSize: 15, lineHeight: 21, color: C.ink, backgroundColor: C.note, padding: 8, borderRadius: 10,
  },
  toast: {
    position: 'absolute', left: 24, right: 24, backgroundColor: C.ink, borderRadius: 14, padding: 12,
  },
  toastText: { color: C.card, fontSize: 16, fontWeight: '700', textAlign: 'center' },
});
