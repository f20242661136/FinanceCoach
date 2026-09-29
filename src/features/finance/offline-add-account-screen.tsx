import Ionicons from '@expo/vector-icons/Ionicons';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  useRouter,
} from 'expo-router';

import {
  AppButton,
} from '@/components/ui/app-button';

import {
  InlineNotice,
} from '@/components/ui/inline-notice';

import {
  colors,
  elevation,
  layout,
  radii,
  spacing,
  typography,
} from '@/design/tokens';

import {
  toUserFacingError,
} from '@/lib/user-facing-error';

import {
  useCreateOfflineAccount,
} from '../../offline/sync/use-create-offline-account';

import {
  useLocalFinanceReferenceData,
} from '../../offline/sync/use-local-finance-reference-data';

function labelFromCode(
  code: string,
): string {
  return code
    .replace(
      /_/g,
      ' ',
    )
    .replace(
      /\b\w/g,
      value =>
        value.toUpperCase(),
    );
}

export function OfflineAddAccountScreen() {
  const router =
    useRouter();

  const reference =
    useLocalFinanceReferenceData();

  const createAccount =
    useCreateOfflineAccount();

  const [
    name,
    setName,
  ] =
    useState('');

  const [
    accountTypeCode,
    setAccountTypeCode,
  ] =
    useState('');

  const [
    currencyCode,
    setCurrencyCode,
  ] =
    useState('');

  const [
    openingBalance,
    setOpeningBalance,
  ] =
    useState('0');

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );

  const accountTypes =
    useMemo(
      () =>
        reference.data
          ?.accountTypes
        ?? [],
      [
        reference.data
          ?.accountTypes,
      ],
    );

  const currencies =
    useMemo(
      () =>
        reference.data
          ?.currencies
        ?? [],
      [
        reference.data
          ?.currencies,
      ],
    );

  useEffect(() => {
    if (
      !accountTypeCode
      && accountTypes.length
    ) {
      // Query-backed reference data intentionally seeds the editable form once available.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAccountTypeCode(
        accountTypes[0].code,
      );
    }
  }, [
    accountTypeCode,
    accountTypes,
  ]);

  useEffect(() => {
    if (
      !currencyCode
      && currencies.length
    ) {
      const preferred =
        currencies.find(
          currency =>
            currency.code
            === 'PKR',
        );

      // Query-backed reference data intentionally seeds the editable form once available.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrencyCode(
        preferred?.code
        ?? currencies[0].code,
      );
    }
  }, [
    currencies,
    currencyCode,
  ]);

  const referencesReady =
    accountTypes.length > 0
    && currencies.length > 0;

  const canSave =
    referencesReady
    && Boolean(
      name.trim(),
    )
    && !createAccount.isPending;

  async function save() {
    setErrorMessage(null);

    try {
      await createAccount
        .mutateAsync({
          name,
          accountTypeCode,
          currencyCode,
          openingBalance,
        });

      router.back();
    } catch (error) {
      setErrorMessage(
        toUserFacingError(
          error,
          'account',
        ),
      );
    }
  }

  return (
    <SafeAreaView
      edges={[
        'bottom',
      ]}
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        style={styles.flex}
      >
        <View style={styles.screen}>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={
              styles.content
            }
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close add account"
                hitSlop={8}
                onPress={() => {
                  router.back();
                }}
                style={({ pressed }) => [
                  styles.closeButton,
                  pressed
                    ? styles.closeButtonPressed
                    : null,
                ]}
              >
                <Ionicons
                  name="close"
                  size={22}
                  color={
                    colors.text
                  }
                />
              </Pressable>

              <View style={styles.headerCopy}>
                <Text style={styles.eyebrow}>
                  NEW ACCOUNT
                </Text>

                <Text
                  accessibilityRole="header"
                  style={styles.title}
                >
                  Add an account
                </Text>

                <Text style={styles.subtitle}>
                  Add the real account you use for spending, saving, or receiving money.
                </Text>
              </View>
            </View>

            {!referencesReady ? (
              <InlineNotice
                tone="info"
                message="Account types and currencies are not available yet. Connect once, then try again."
              />
            ) : null}

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>
                  Account details
                </Text>

                <Text style={styles.sectionBody}>
                  Give it a name you will recognize quickly.
                </Text>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>
                  Account name
                  <Text style={styles.required}>
                    {' *'}
                  </Text>
                </Text>

                <TextInput
                  accessibilityLabel="Account name"
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Salary account"
                  placeholderTextColor={
                    colors.textTertiary
                  }
                  selectionColor={
                    colors.focus
                  }
                  autoCapitalize="words"
                  returnKeyType="next"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>
                  Account type
                </Text>

                <Text style={styles.sectionBody}>
                  Choose the closest match. This does not change how your balance is calculated.
                </Text>
              </View>

              <View style={styles.chips}>
                {accountTypes.map(
                  type => {
                    const selected =
                      accountTypeCode
                      === type.code;

                    return (
                      <Pressable
                        key={type.code}
                        accessibilityRole="button"
                        accessibilityState={{
                          selected,
                        }}
                        accessibilityLabel={
                          labelFromCode(
                            type.code,
                          )
                        }
                        onPress={() => {
                          setAccountTypeCode(
                            type.code,
                          );
                        }}
                        style={({ pressed }) => [
                          styles.chip,
                          selected
                            ? styles.chipSelected
                            : null,
                          pressed
                            ? styles.chipPressed
                            : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected
                              ? styles.chipTextSelected
                              : null,
                          ]}
                        >
                          {labelFromCode(
                            type.code,
                          )}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>
                  Currency
                </Text>

                <Text style={styles.sectionBody}>
                  Balances in different currencies stay separate. Finance Coach does not assume an exchange rate.
                </Text>
              </View>

              <View style={styles.chips}>
                {currencies.map(
                  currency => {
                    const selected =
                      currencyCode
                      === currency.code;

                    return (
                      <Pressable
                        key={
                          currency.code
                        }
                        accessibilityRole="button"
                        accessibilityState={{
                          selected,
                        }}
                        accessibilityLabel={
                          currency.code
                        }
                        onPress={() => {
                          setCurrencyCode(
                            currency.code,
                          );
                        }}
                        style={({ pressed }) => [
                          styles.chip,
                          selected
                            ? styles.chipSelected
                            : null,
                          pressed
                            ? styles.chipPressed
                            : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            selected
                              ? styles.chipTextSelected
                              : null,
                          ]}
                        >
                          {currency.code}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeading}>
                <Text style={styles.sectionTitle}>
                  Opening balance
                </Text>

                <Text style={styles.sectionBody}>
                  Enter the balance this account has now. Use zero if you want to start tracking from today.
                </Text>
              </View>

              <View style={styles.amountField}>
                <Text style={styles.currencyPrefix}>
                  {currencyCode || '---'}
                </Text>

                <TextInput
                  accessibilityLabel="Opening balance"
                  value={openingBalance}
                  onChangeText={setOpeningBalance}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={
                    colors.textTertiary
                  }
                  selectionColor={
                    colors.focus
                  }
                  style={styles.amountInput}
                />
              </View>
            </View>

            {errorMessage ? (
              <InlineNotice
                tone="error"
                message={errorMessage}
              />
            ) : null}

            <View style={styles.offlineCard}>
              <View style={styles.offlineIcon}>
                <Ionicons
                  name="cloud-upload-outline"
                  size={20}
                  color={
                    colors.primary
                  }
                />
              </View>

              <View style={styles.offlineCopy}>
                <Text style={styles.offlineTitle}>
                  Offline-ready
                </Text>

                <Text style={styles.offlineBody}>
                  The account can be saved securely on this device first. Until synchronization completes, it is marked Pending sync.
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={styles.actionFooter}>
            <AppButton
              label={
                createAccount.isPending
                  ? 'Saving account...'
                  : 'Save account'
              }
              icon="checkmark-outline"
              loading={
                createAccount.isPending
              }
              disabled={
                !canSave
              }
              onPress={() => {
                void save();
              }}
            />

            <Text style={styles.footerHint}>
              This action bar uses its own layout space and never covers the form above.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles =
  StyleSheet.create({
    flex: {
      flex: 1,
    },

    safeArea: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    screen: {
      flex: 1,
      backgroundColor:
        colors.background,
    },

    content: {
      width: '100%',
      maxWidth:
        layout.contentMaxWidth,
      alignSelf: 'center',
      paddingHorizontal:
        layout.screenHorizontalPadding,
      paddingTop:
        spacing.md,
      paddingBottom:
        spacing.xl,
      gap:
        spacing.lg,
    },

    header: {
      gap:
        spacing.md,
    },

    closeButton: {
      width:
        layout.touchTarget,
      height:
        layout.touchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      alignSelf: 'flex-start',
      marginLeft:
        -spacing.sm,
      borderRadius:
        radii.pill,
    },

    closeButtonPressed: {
      backgroundColor:
        colors.surfaceMuted,
    },

    headerCopy: {
      gap:
        spacing.xs,
    },

    eyebrow: {
      color:
        colors.primary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: 1.1,
    },

    title: {
      color:
        colors.text,
      fontSize:
        typography.heading,
      lineHeight:
        typography.lineHeightHeading,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.4,
    },

    subtitle: {
      maxWidth: 440,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
    },

    section: {
      gap:
        spacing.md,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.surface,
      ...elevation.card,
    },

    sectionHeading: {
      gap:
        spacing.xxs,
    },

    sectionTitle: {
      color:
        colors.text,
      fontSize:
        typography.body,
      lineHeight:
        typography.lineHeightBody,
      fontWeight:
        typography.weightBold,
    },

    sectionBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    field: {
      gap:
        spacing.xs,
    },

    label: {
      color:
        colors.text,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    required: {
      color:
        colors.danger,
    },

    input: {
      minHeight: 54,
      paddingHorizontal:
        spacing.md,
      borderRadius:
        radii.md,
      borderWidth: 1,
      borderColor:
        colors.borderStrong,
      backgroundColor:
        colors.background,
      color:
        colors.text,
      fontSize:
        typography.body,
    },

    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap:
        spacing.sm,
    },

    chip: {
      minHeight:
        layout.touchTarget,
      justifyContent: 'center',
      paddingHorizontal:
        spacing.md,
      paddingVertical:
        spacing.sm,
      borderRadius:
        radii.pill,
      borderWidth: 1,
      borderColor:
        colors.border,
      backgroundColor:
        colors.background,
    },

    chipSelected: {
      borderColor:
        colors.primary,
      backgroundColor:
        colors.primarySoft,
    },

    chipPressed: {
      opacity: 0.82,
    },

    chipText: {
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightSemibold,
    },

    chipTextSelected: {
      color:
        colors.primary,
      fontWeight:
        typography.weightBold,
    },

    amountField: {
      minHeight: 72,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal:
        spacing.md,
      borderRadius:
        radii.lg,
      borderWidth: 1,
      borderColor:
        colors.borderStrong,
      backgroundColor:
        colors.background,
    },

    currencyPrefix: {
      minWidth: 42,
      color:
        colors.textSecondary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    amountInput: {
      flex: 1,
      minHeight: 64,
      color:
        colors.text,
      fontSize: 28,
      lineHeight: 34,
      fontWeight:
        typography.weightExtraBold,
      letterSpacing: -0.5,
    },

    offlineCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap:
        spacing.sm,
      padding:
        spacing.md,
      borderRadius:
        radii.lg,
      backgroundColor:
        colors.primarySoft,
    },

    offlineIcon: {
      width: 38,
      height: 38,
      borderRadius:
        radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        colors.white,
    },

    offlineCopy: {
      flex: 1,
      gap:
        spacing.xxs,
    },

    offlineTitle: {
      color:
        colors.primary,
      fontSize:
        typography.small,
      lineHeight:
        typography.lineHeightSmall,
      fontWeight:
        typography.weightBold,
    },

    offlineBody: {
      color:
        colors.textSecondary,
      fontSize:
        typography.caption,
      lineHeight:
        typography.lineHeightCaption,
    },

    actionFooter: {
      width: '100%',
      maxWidth:
        layout.contentMaxWidth,
      alignSelf: 'center',
      gap:
        spacing.xs,
      paddingHorizontal:
        layout.screenHorizontalPadding,
      paddingTop:
        spacing.sm,
      paddingBottom:
        spacing.sm,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor:
        colors.border,
      backgroundColor:
        colors.surface,
    },

    footerHint: {
      color:
        colors.textTertiary,
      fontSize: 10,
      lineHeight: 14,
      textAlign: 'center',
    },
  });