import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { androidTextFix, colors, font, radii } from '../theme';
import Txt from './Txt';

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secure,
  keyboardType = 'default',
  autoCapitalize = 'none',
  icon,
  error,
  hint,
  maxLength,
  autoFocus,
  testID,
  inputStyle,
  style,
  ...rest
}) {
  const [hidden, setHidden] = useState(Boolean(secure));
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.block, style]}>
      {label ? (
        <Txt variant="meta" tone="muted" style={styles.label}>
          {label}
        </Txt>
      ) : null}
      <View style={[styles.box, focused ? styles.boxFocused : null, error ? styles.boxError : null]}>
        {icon ? <Ionicons name={icon} size={18} color={colors.textDim} style={styles.leftIcon} /> : null}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textDim}
          secureTextEntry={hidden}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          allowFontScaling={false}
          underlineColorAndroid="transparent"
          style={[styles.input, inputStyle]}
          testID={testID}
          {...rest}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((prev) => !prev)} hitSlop={10} style={styles.rightIcon}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={19} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Txt variant="small" tone="lose" style={styles.hint}>
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="small" tone="dim" style={styles.hint}>
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { marginBottom: 14 },
  label: { marginBottom: 6, marginLeft: 4 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    minHeight: 52,
  },
  boxFocused: { borderColor: colors.accent, backgroundColor: colors.surface2 },
  boxError: { borderColor: colors.lose },
  input: {
    flex: 1,
    color: colors.text,
    fontFamily: font.medium,
    fontSize: 14.5,
    paddingVertical: 12,
    // Android menambah font padding sendiri sehingga tinggi input berbeda dari iOS.
    ...androidTextFix,
  },
  leftIcon: { marginRight: 10 },
  rightIcon: { marginLeft: 10 },
  hint: { marginTop: 5, marginLeft: 4 },
});

export default Field;
