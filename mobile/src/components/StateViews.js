import React from 'react';
import {
  View, Text, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, typography, radius } from '../theme/theme';

export function LoadingState({ label = 'Loading beats…' }) {
  return (
    <View style={styles.center} testID="loading-state">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

export function EmptyState({
  title = 'No beats found',
  subtitle = 'Try a different search term.',
}) {
  return (
    <View style={styles.center} testID="empty-state">
      <Feather name="music" size={40} color={colors.textFaint} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.label}>{subtitle}</Text>
    </View>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  subtitle = 'Please check your connection and try again.',
  onRetry,
}) {
  return (
    <View style={styles.center} testID="error-state">
      <Feather name="alert-circle" size={40} color={colors.error} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.label}>{subtitle}</Text>
      {onRetry ? (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry} testID="retry-button">
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    ...typography.subtitle,
    marginBottom: spacing.xs,
    textAlign: 'center',
    color: colors.text,
  },
  label: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 20,
    color: colors.textMuted,
  },
  retryButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
  },
  retryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
