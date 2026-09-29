import {
  useEffect,
  useState,
  useMemo,
} from 'react';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  colors,
  layout,
} from '@/design/tokens';

import {
  useRouter,
} from 'expo-router';

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
      (value) =>
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


  const accountTypes = useMemo(
    () => reference.data
      ?.accountTypes ?? [],
    [reference.data
      ?.accountTypes],
  );

  const currencies = useMemo(
    () => reference.data
      ?.currencies ?? [],
    [reference.data
      ?.currencies],
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
          (currency) =>
            currency.code ===
            'PKR',
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


  async function save() {
    setErrorMessage(
      null,
    );

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
        error instanceof Error
          ? error.message
          : 'Could not save the account.',
      );
    }
  }


  const referencesReady =
    accountTypes.length > 0
    && currencies.length > 0;


  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        NEW ACCOUNT
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Add an account
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Save it securely now. We’ll confirm it with your server ledger when connected.
      </Text>


      {!referencesReady ? (
        <View
          style={
            styles.notice
          }
        >
          <Text
            style={
              styles.noticeTitle
            }
          >
            Account setup data unavailable
          </Text>

          <Text
            style={
              styles.noticeBody
            }
          >
            Connect once to load supported account types and currencies.
          </Text>
        </View>
      ) : null}


      <Text
        style={
          styles.label
        }
      >
        Account name
      </Text>

      <TextInput
        value={
          name
        }
        onChangeText={
          setName
        }
        placeholder="e.g. Salary account"
        style={
          styles.input
        }
      />


      <Text
        style={
          styles.label
        }
      >
        Account type
      </Text>

      <View
        style={
          styles.chips
        }
      >
        {accountTypes.map(
          (type) => (
            <Pressable
              key={
                type.code
              }
              onPress={() => {
                setAccountTypeCode(
                  type.code,
                );
              }}
              style={[
                styles.chip,

                accountTypeCode ===
                  type.code
                  ? styles.chipSelected
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.chipText,

                  accountTypeCode ===
                    type.code
                    ? styles.chipTextSelected
                    : null,
                ]}
              >
                {labelFromCode(
                  type.code,
                )}
              </Text>
            </Pressable>
          ),
        )}
      </View>


      <Text
        style={
          styles.label
        }
      >
        Currency
      </Text>

      <View
        style={
          styles.chips
        }
      >
        {currencies.map(
          (currency) => (
            <Pressable
              key={
                currency.code
              }
              onPress={() => {
                setCurrencyCode(
                  currency.code,
                );
              }}
              style={[
                styles.chip,

                currencyCode ===
                  currency.code
                  ? styles.chipSelected
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.chipText,

                  currencyCode ===
                    currency.code
                    ? styles.chipTextSelected
                    : null,
                ]}
              >
                {currency.code}
              </Text>
            </Pressable>
          ),
        )}
      </View>


      <Text
        style={
          styles.label
        }
      >
        Opening balance
      </Text>

      <TextInput
        value={
          openingBalance
        }
        onChangeText={
          setOpeningBalance
        }
        keyboardType="decimal-pad"
        placeholder="0.00"
        style={
          styles.input
        }
      />


      {errorMessage ? (
        <View
          style={[
            styles.notice,
            styles.errorNotice,
          ]}
        >
          <Text
            style={
              styles.errorText
            }
          >
            {errorMessage}
          </Text>
        </View>
      ) : null}


      <View
        style={
          styles.notice
        }
      >
        <Text
          style={
            styles.noticeTitle
          }
        >
          Offline-ready
        </Text>

        <Text
          style={
            styles.noticeBody
          }
        >
          Until synchronization finishes, the account is marked Pending sync and its opening balance is provisional.
        </Text>
      </View>


      <Pressable
        disabled={
          !referencesReady
          || !name.trim()
          || createAccount.isPending
        }
        onPress={() => {
          void save();
        }}
        style={[
          styles.save,

          (
            !referencesReady
            || !name.trim()
            || createAccount.isPending
          )
            ? styles.disabled
            : null,
        ]}
      >
        <Text
          style={
            styles.saveText
          }
        >
          {createAccount.isPending
            ? 'Saving…'
            : 'Save account'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}


const styles =
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    content: {
      width: '100%',
      maxWidth: layout.contentMaxWidth,
      alignSelf: 'center',
      flexGrow: 1,
      paddingHorizontal: layout.screenHorizontalPadding,
      paddingTop: 22,
      paddingBottom: 120,
    },

    eyebrow: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: 1.4,
    },

    title: {
      marginTop: 8,
      color: colors.text,
      fontSize: 29,
      lineHeight: 35,
      fontWeight: '700',
    },

    subtitle: {
      marginTop: 8,
      marginBottom: 24,
      color: colors.textSecondary,
      fontSize: 14,
      lineHeight: 21,
    },

    label: {
      marginTop: 18,
      marginBottom: 8,
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },

    input: {
      minHeight: 52,
      paddingHorizontal: 14,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: 15,
    },

    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    chip: {
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },

    chipSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primarySoft,
    },

    chipText: {
      color: colors.textSecondary,
      fontSize: 13,
      fontWeight: '600',
    },

    chipTextSelected: {
      color: colors.primary,
      fontWeight: '700',
    },

    notice: {
      marginTop: 20,
      padding: 14,
      borderRadius: 14,
      backgroundColor: colors.surfaceMuted,
    },

    noticeTitle: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },

    noticeBody: {
      marginTop: 4,
      color: colors.textSecondary,
      fontSize: 12,
      lineHeight: 18,
    },

    errorNotice: {
      backgroundColor: colors.dangerSurface,
    },

    errorText: {
      color: colors.danger,
      fontSize: 13,
      lineHeight: 18,
    },

    save: {
      minHeight: 54,
      marginTop: 24,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 15,
      backgroundColor: colors.primary,
    },

    disabled: {
      opacity: 0.45,
    },

    saveText: {
      color: colors.textOnPrimary,
      fontSize: 15,
      fontWeight: '700',
    },
  });