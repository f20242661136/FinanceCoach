import * as Crypto from 'expo-crypto';
import { useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { AppButton } from '@/components/ui/app-button';
import { colors, typography } from '@/design/tokens';
import { useAuth } from '@/features/auth/auth-context';
import { toUserFacingError } from '@/lib/user-facing-error';
import { createAiConversation, sendAiCoachMessage } from './ai-coach-service';
import { aiCoachKeys } from './ai-coach-query';

// Independent route keeps both the original chat and the installed redesign compatible.
export function CoachContextScreen() {
  const { prompt } = useLocalSearchParams<{ prompt?: string | string[] }>();
  const initial = (Array.isArray(prompt) ? prompt[0] : prompt) ?? '';
  const { session, profile } = useAuth();
  return <ContextComposer key={session?.user.id} initial={initial.slice(0, 4000)} timezone={profile?.timezone ?? 'UTC'} />;
}

function ContextComposer({ initial, timezone }: { initial: string; timezone: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const locked = useRef(false);
  // Keep identifiers on retries, so a timeout does not create duplicate conversations/messages.
  const attempt = useRef<{ conversationId: string; created: boolean; message: string; userMessageId: string; assistantMessageId: string } | null>(null);

  async function send() {
    const message = draft.trim();
    if (!message || locked.current) return;
    locked.current = true;
    setBusy(true); setError(null);
    if (!attempt.current || attempt.current.message !== message) {
      attempt.current = { conversationId: attempt.current?.conversationId ?? Crypto.randomUUID(),
        created: attempt.current?.created ?? false, message,
        userMessageId: Crypto.randomUUID(), assistantMessageId: Crypto.randomUUID() };
    }
    const current = attempt.current;
    try {
      if (!current.created) {
        current.conversationId = await createAiConversation(current.conversationId, 'My financial next step');
        current.created = true;
      }
      await sendAiCoachMessage({ conversationId: current.conversationId, userMessageId: current.userMessageId,
        assistantMessageId: current.assistantMessageId, message, timezone });
      await queryClient.invalidateQueries({ queryKey: aiCoachKeys.all });
      router.replace({ pathname: '/ai-chat', params: { conversationId: current.conversationId } } as never);
    } catch (cause) {
      setError(toUserFacingError(cause, 'generic'));
    } finally { locked.current = false; setBusy(false); }
  }

  return <SafeAreaView edges={['bottom']} style={styles.screen}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>Ask Coach</Text>
        <Text style={styles.body}>Start with this question, or make it your own.</Text>
        <TextInput accessibilityLabel="Question for Finance Coach" editable={!busy} value={draft} onChangeText={setDraft}
          multiline maxLength={4000} textAlignVertical="top" style={styles.composer} />
        <Text style={styles.body}>Uses your synced Finance Coach data · cannot move money</Text>
        {error && <Text accessibilityRole="alert" accessibilityLiveRegion="assertive" style={styles.error}>{error}</Text>}
        <AppButton label="Send to Coach" loading={busy} disabled={!draft.trim() || busy} onPress={() => { void send(); }} />
        <AppButton label="Back" variant="ghost" disabled={busy} onPress={() => { if (router.canGoBack()) router.back(); else router.replace('/home' as never); }} />
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background }, flex: { flex: 1 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', padding: 24, gap: 24 },
  title: { fontSize: 28, lineHeight: 36, fontWeight: typography.weightSemibold, color: colors.text },
  body: { fontSize: 14, lineHeight: 22, color: colors.textSecondary },
  composer: { minHeight: 180, padding: 20, borderRadius: 18, backgroundColor: colors.surface, color: colors.text, fontSize: 16, lineHeight: 24 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 22 },
});
