import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { C } from './theme';

// Big rounded button. Use \n in the label for a second line, as the mockup does.
export function Btn({ label, onPress, primary, style, textStyle, disabled }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.btn,
        primary && styles.btnPrimary,
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text style={[styles.btnText, primary && styles.btnTextPrimary, textStyle]}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, on, onPress, style }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.chip, on ? styles.chipOn : null, pressed && styles.pressed, style]}
    >
      <Text numberOfLines={1} style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function Link({ label, onPress, style }) {
  return (
    <Pressable accessibilityRole="link" onPress={onPress} hitSlop={8}>
      <Text style={[styles.link, style]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 50,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.card,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimary: { backgroundColor: C.green, borderColor: C.green },
  btnText: { fontSize: 17, fontWeight: '700', color: C.ink, textAlign: 'center' },
  btnTextPrimary: { color: C.card },
  chip: {
    height: 40,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.card,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { fontSize: 15, fontWeight: '700', color: C.ink },
  chipTextOn: { color: C.card },
  link: { color: C.blue, fontSize: 15, fontWeight: '700', textDecorationLine: 'underline' },
  pressed: { opacity: 0.75 },
  disabled: { opacity: 0.5 },
});
