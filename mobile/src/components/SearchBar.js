import React, { useRef, useState } from 'react';
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius } from '../theme/theme';

export default function SearchBar({ value, onChangeText, onSubmit, onClear, placeholder }) {
  const [focused, setFocused] = useState(false);
  const glow = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(glow, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };
  const handleBlur = () => {
    setFocused(false);
    Animated.timing(glow, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.accent],
  });

  return (
    <Animated.View style={[styles.container, { borderColor }]}>
      <Text style={styles.icon}>⌕</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder || 'Search title, producer, genre, mood…'}
        placeholderTextColor={colors.textFaint}
        returnKeyType="search"
        autoCorrect={false}
        testID="search-input"
      />
      {value?.length > 0 && (
        <TouchableOpacity onPress={onClear} style={styles.clearBtn} testID="search-clear">
          <Feather name="x" size={16} color={colors.textFaint} />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  icon: {
    color: colors.accent,
    fontSize: 18,
    marginRight: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 0,
  },
  clearBtn: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
});
