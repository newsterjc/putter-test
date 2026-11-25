import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useTest } from '../src/TestContext';
import { Btn, Chip, Link } from '../src/ui';
import Pops from '../src/Pops';
import { C } from '../src/theme';
import { STATIONS, lettersFor } from '../src/logic';

// Setup screen: names, head length, advanced settings, then Start.
export default function Setup() {
  const t = useTest();
  const { d } = t;
  const insets = useSafeAreaInsets();
  const [showAdv, setShowAdv] = useState(false);
  // Only show the pattern link after Simulate is pressed on this screen, not from saved data.
  const [simShown, setSimShown] = useState(false);
  const [headText, setHeadText] = useState(d.headLen ? String(d.headLen) : '');

  const count = d.putterCount;
  const letters = lettersFor(count);
  const hasData = t.hasData;
  const isHeads = d.unit === 'heads';

  const onStart = () => {
    if (t.start()) router.push('/entry');
  };

  const onContinue = () => {
    const target = t.resume();
    router.push(target === 'pattern' ? '/pattern' : '/entry');
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 12 }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.eyebrow}>Deez-putts</Text>
        <Text style={styles.h1}>{"Let's set up your test"}</Text>
        <Text style={styles.p}>Each putter gets a letter.</Text>

        <View style={styles.linkRow}>
          <Link label="Click here to simulate data" onPress={() => { t.runSimulate(); setSimShown(true); }} />
          {simShown && d.simulated ? <Link label="See the putting pattern →" onPress={() => { t.goPattern('setup'); router.push('/pattern'); }} /> : null}
          {hasData && !d.simulated ? <Link label="Continue test →" onPress={onContinue} /> : null}
        </View>
        {simShown && d.simLast ? (
          <Text style={styles.simNote}>{`Simulated: ${d.simLast === 'winner' ? 'winner' : 'no winner'}`}</Text>
        ) : null}

        <View style={styles.card}>
          {letters.map((letter, p) => (
            <View key={letter} style={styles.field}>
              <Text style={styles.label}>
                <Text style={styles.bold}>{`Putter ${'ABC'[p]}`}</Text>
                {' · name it'}
              </Text>
              <TextInput
                style={styles.input}
                value={d.names[p]}
                placeholder={`Putter ${'ABC'[p]}`}
                maxLength={10}
                onChangeText={(v) => t.setName(p, v)}
                accessibilityLabel={`Putter ${'ABC'[p]} name`}
              />
            </View>
          ))}

          {isHeads ? (
            <View style={styles.field}>
              <Text style={styles.label}>Measuring Putter Head Length (in)</Text>
              <Text style={styles.sub}>Can change to straight inches in Advanced Settings below</Text>
              <TextInput
                style={styles.input}
                value={headText}
                placeholder="4 to 8"
                keyboardType="decimal-pad"
                onChangeText={(v) => setHeadText(v.match(/^\d*(\.\d{0,2})?/)[0])}
                onBlur={() => t.checkHeadLength(headText)}
                accessibilityLabel="Measuring head length in inches"
              />
            </View>
          ) : null}
        </View>

        <Link label={showAdv ? 'Hide advanced settings ▴' : 'Advanced settings ▾'} onPress={() => setShowAdv(!showAdv)} style={styles.advLink} />

        {showAdv ? (
          <View style={styles.card}>
            <Text style={styles.cap}>Number of putters</Text>
            <View style={styles.row}>
              <Chip label="2 putters" on={count === 2} onPress={() => t.setPutterCount(2)} style={styles.flex} />
              <Chip label="3 putters" on={count === 3} onPress={() => t.setPutterCount(3)} style={styles.flex} />
            </View>
            <Text style={styles.cap}>Units</Text>
            <View style={styles.row}>
              <Chip label="Putter heads" on={isHeads} onPress={() => t.setUnit('heads')} style={styles.flex} />
              <Chip label="Inches" on={!isHeads} onPress={() => t.setUnit('inches')} style={styles.flex} />
            </View>
            <Text style={styles.distances}>{`Distances: 4, 8 and 15 ft · Stations: ${STATIONS}`}</Text>
          </View>
        ) : null}
      </ScrollView>

      <Btn
        primary
        label={`Start test · ${STATIONS} stations · ${count} putters`}
        onPress={onStart}
        style={styles.start}
      />

      <Pops keys={['needHead', 'dupNames', 'unitLocked', 'headRange']} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg, paddingHorizontal: 14 },
  content: { gap: 10, paddingBottom: 12 },
  eyebrow: { fontSize: 14, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', color: '#5A6B5C' },
  h1: { fontSize: 24, lineHeight: 28, fontWeight: '800', color: C.ink },
  p: { fontSize: 15, lineHeight: 20, color: C.ink },
  simNote: { fontSize: 15, fontWeight: '700', color: C.green },
  linkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, alignItems: 'center' },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.line,
    padding: 10,
    gap: 8,
  },
  field: { gap: 4 },
  label: { fontSize: 15, fontWeight: '700', color: C.ink },
  bold: { fontWeight: '800' },
  sub: { fontSize: 12, color: C.muted },
  input: {
    height: 40,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 10,
    paddingHorizontal: 10,
    fontSize: 17,
    color: C.ink,
    backgroundColor: C.card,
  },
  advLink: { fontSize: 15, alignSelf: 'flex-start' },
  cap: { fontSize: 14, fontWeight: '700', color: C.muted },
  row: { flexDirection: 'row', gap: 6 },
  flex: { flex: 1 },
  distances: { fontSize: 14, color: C.ink, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6 },
  start: { backgroundColor: C.green, borderColor: C.green, marginTop: 8 },
});
