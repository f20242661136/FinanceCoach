import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/ui/app-button';
import {
  colors,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';
import { useAuth } from '@/features/auth/auth-context';
import { copy } from '@/i18n/copy';

type InsightCardProps = {
  icon:
    | 'lock-closed-outline'
    | 'calculator-outline'
    | 'arrow-forward-circle-outline';
  title: string;
  body: string;
};

function InsightCard({
  icon,
  title,
  body,
}: InsightCardProps) {
  return (
    <View style={styles.insightCard}>
      <View style={styles.insightIcon}>
        <Ionicons
          name={icon}
          size={22}
          color={colors.primary}
        />
      </View>

      <View style={styles.insightCopy}>
        <Text style={styles.insightTitle}>
          {title}
        </Text>

        <Text style={styles.insightBody}>
          {body}
        </Text>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const {
    profile,
    session,
    signOut,
  } = useAuth();

  const name =
    profile?.display_name?.trim() ||
    session?.user.email ||
    copy.home.greeting;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <View style={styles.topBar}>
            <View style={styles.mark}>
              <Ionicons
                name="wallet-outline"
                size={23}
                color={colors.white}
              />
            </View>

            <View style={styles.topCopy}>
              <Text style={styles.eyebrow}>
                {copy.home.eyebrow}
              </Text>

              <Text
                numberOfLines={1}
                style={styles.user}
              >
                {name}
              </Text>
            </View>

            <View style={styles.avatar}>
              <Ionicons
                name="person-outline"
                size={20}
                color={colors.primary}
              />
            </View>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroPill}>
              <Ionicons
                name="shield-checkmark-outline"
                size={17}
                color={colors.success}
              />

              <Text style={styles.heroPillText}>
                {
                  copy.common
                    .privateByDesign
                }
              </Text>
            </View>

            <Text style={styles.title}>
              {copy.home.title}
            </Text>

            <Text style={styles.body}>
              {copy.home.body}
            </Text>

            <View style={styles.currencyRow}>
              <Text style={styles.currencyLabel}>
                {copy.home.currency}
              </Text>

              <Text style={styles.currencyValue}>
                {
                  profile?.base_currency_code ??
                  'â€”'
                }
              </Text>
            </View>
          </View>

          <View style={styles.insights}>
            <InsightCard
              icon="lock-closed-outline"
              title={
                copy.home.privacyTitle
              }
              body={
                copy.home.privacyBody
              }
            />

            <InsightCard
              icon="calculator-outline"
              title={
                copy.home.correctnessTitle
              }
              body={
                copy.home.correctnessBody
              }
            />

            <InsightCard
              icon="arrow-forward-circle-outline"
              title={copy.home.nextTitle}
              body={copy.home.nextBody}
            />
          </View>

          <AppButton
            label={copy.common.signOut}
            variant="secondary"
            onPress={() => {
              void signOut();
            }}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },

  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },

  content: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    gap: spacing.xl,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },

  mark: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  topCopy: {
    flex: 1,
  },

  eyebrow: {
    color: colors.textSecondary,
    fontSize: typography.caption,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  user: {
    marginTop: 2,
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  hero: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: 26,
    backgroundColor: colors.primary,
  },

  heroPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.white,
  },

  heroPillText: {
    color: colors.success,
    fontSize: typography.caption,
    fontWeight: '800',
  },

  title: {
    color: colors.white,
    fontSize: typography.title,
    lineHeight: 40,
    fontWeight: '800',
    letterSpacing: -0.8,
  },

  body: {
    color: '#DDEAE4',
    fontSize: typography.body,
    lineHeight: 24,
  },

  currencyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor:
      'rgba(255,255,255,0.15)',
  },

  currencyLabel: {
    color: '#DDEAE4',
    fontSize: typography.small,
  },

  currencyValue: {
    color: colors.white,
    fontSize: typography.subheading,
    fontWeight: '800',
  },

  insights: {
    gap: spacing.sm,
  },

  insightCard: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  insightIcon: {
    width: 46,
    height: 46,
    borderRadius: radii.md,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },

  insightCopy: {
    flex: 1,
    gap: 4,
  },

  insightTitle: {
    color: colors.text,
    fontSize: typography.body,
    fontWeight: '800',
  },

  insightBody: {
    color: colors.textSecondary,
    fontSize: typography.small,
    lineHeight: 20,
  },
});