import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, elevation, typography } from '@/design/tokens';
import type { SetupFacts } from './setup-progress';

export function SetupSteps({ facts, choosingCurrency = false }: { facts?: SetupFacts; choosingCurrency?: boolean }) {
  const steps = [
    { label: 'Currency', done: !choosingCurrency },
    { label: 'Account', done: facts?.hasActiveAccount ?? false },
    { label: 'Transaction', done: facts?.hasTransaction ?? false },
  ];
  return <View style={setupStyles.steps}>{steps.map((step, index) => <View key={step.label} style={setupStyles.step}
    accessible accessibilityLabel={`${index + 1}. ${step.label}${step.done ? ', complete' : ''}`}>
    <View style={[setupStyles.number, step.done && setupStyles.done]}>
      {step.done ? <Ionicons name="checkmark" size={18} color={colors.success} /> : <Text style={setupStyles.numberText}>{index + 1}</Text>}
    </View><Text style={setupStyles.caption}>{step.label}</Text>
  </View>)}</View>;
}

export const setupStyles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderRadius: 18, padding: 24, gap: 16, ...elevation.card },
  stack: { gap: 16 },
  title: { fontSize: 26, lineHeight: 34, color: colors.text, fontWeight: typography.weightSemibold },
  heading: { fontSize: 20, lineHeight: 28, color: colors.text, fontWeight: typography.weightSemibold },
  body: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  caption: { fontSize: 12, lineHeight: 19, color: colors.textSecondary },
  eyebrow: { fontSize: 12, lineHeight: 19, color: colors.primary, fontWeight: typography.weightSemibold },
  input: { minHeight: 52, borderRadius: 12, backgroundColor: colors.surfaceMuted, padding: 16, color: colors.text, fontSize: 16 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  steps: { flexDirection: 'row', gap: 12 },
  step: { flex: 1, gap: 8, alignItems: 'center' },
  number: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  numberText: { color: colors.primary, fontWeight: typography.weightSemibold },
  done: { backgroundColor: colors.successSurface },
  link: { color: colors.primary, fontSize: 14, lineHeight: 22, fontWeight: typography.weightSemibold },
  textAction: { minHeight: 48, justifyContent: 'center' },
});
