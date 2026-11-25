import React from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useTest } from './TestContext';
import { Btn } from './ui';
import { C } from './theme';
import { LETTERS, nameOf } from './logic';

// Shows only the pop-ups listed in `keys` for this screen. Wording matches the approved mockup.
export default function Pops({ keys }) {
  const t = useTest();
  const { pop, d } = t;
  if (!pop || !keys.includes(pop)) return null;

  const close = () => t.closePop();
  const okOnly = (text) => (
    <View style={styles.box}>
      <Text style={styles.text}>{text}</Text>
      <Btn primary label="OK" onPress={close} />
    </View>
  );

  let body = null;
  switch (pop) {
    case 'needHead':
      body = okOnly('Enter head length first.');
      break;
    case 'dupNames':
      body = okOnly('Each putter needs a different name.');
      break;
    case 'unitLocked':
      body = okOnly("Units can't change mid-test.");
      break;
    case 'headRange':
      body = okOnly('The range for this value is 4-8 inches.');
      break;
    case 'maxMiss':
      body = okOnly('15 is the max miss');
      break;
    case 'cut': {
      const name = nameOf(d, LETTERS.indexOf(d.cut));
      body = (
        <View style={styles.box}>
          <Text style={styles.cutBubble}>{`${name} has been eliminated.`}</Text>
          <Btn primary label="OK" onPress={close} />
        </View>
      );
      break;
    }
    case 'editConfirm':
      body = (
        <View style={styles.box}>
          <Text style={styles.text}>
            Changing data in stations 1-9 may change which putter is dropped. If it does, data for stations 10 and on will be deleted. If there's no change, data already entered won't be deleted.
          </Text>
          <View style={styles.row}>
            <Btn label="Keep editing" style={styles.flex} onPress={t.cancelPop} />
            <Btn primary label="Save anyway" style={styles.flex} onPress={() => {
              const r = t.confirmSave();
              if (r === 'finished') router.replace('/pattern');
            }} />
          </View>
        </View>
      );
      break;
    case 'export':
      body = (
        <View style={styles.box}>
          <Text style={styles.text}>Export results as CSV?</Text>
          <View style={styles.row}>
            <Btn label="Cancel" style={styles.flex} onPress={t.cancelPop} />
            <Btn primary label="Export" style={styles.flex} onPress={t.confirmExport} />
          </View>
        </View>
      );
      break;
    default:
      return null;
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <View style={styles.overlay}>
        <View style={styles.popBox}>{body}</View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(27,42,34,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  popBox: {
    width: '100%',
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.ink,
    borderRadius: 16,
    padding: 20,
  },
  box: { gap: 14 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  text: { fontSize: 18, fontWeight: '700', lineHeight: 25, color: C.ink },
  cutBubble: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 25,
    color: C.redInk,
    backgroundColor: C.redBg,
    borderWidth: 2,
    borderColor: C.red,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    textAlign: 'center',
    overflow: 'hidden',
  },
});
