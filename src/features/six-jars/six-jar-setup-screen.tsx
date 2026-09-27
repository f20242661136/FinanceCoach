import {
  useEffect,
  useMemo,
  useState,
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
  elevation,
  layout,
  radii,
  typography,
} from '@/design/tokens';

import * as Crypto from 'expo-crypto';

import {
  useRouter,
} from 'expo-router';

import {
  useLocalFinanceReferenceData,
} from '../../offline/sync/use-local-finance-reference-data';

import {
  basisPointsToPercentText,
  percentTextToBasisPoints,
  sumBasisPoints,
} from './six-jar-format';

import {
  useSaveSixJarProfile,
  useSixJarProfile,
} from './six-jar-query';


type EditableJar = {
  id: string;
  name: string;
  code: string;
  percentageText: string;
  sortOrder: number;
};


const CLASSIC_JARS:
  Omit<
    EditableJar,
    'id'
  >[] =
  [
    {
      name: 'Necessities',
      code: 'necessities',
      percentageText: '55',
      sortOrder: 10,
    },
    {
      name: 'Financial Freedom',
      code: 'financial_freedom',
      percentageText: '10',
      sortOrder: 20,
    },
    {
      name: 'Education',
      code: 'education',
      percentageText: '10',
      sortOrder: 30,
    },
    {
      name: 'Long-Term Savings',
      code: 'long_term_savings',
      percentageText: '10',
      sortOrder: 40,
    },
    {
      name: 'Play',
      code: 'play',
      percentageText: '10',
      sortOrder: 50,
    },
    {
      name: 'Give',
      code: 'give',
      percentageText: '5',
      sortOrder: 60,
    },
  ];


function newClassicJars():
  EditableJar[] {
  return CLASSIC_JARS.map(
    (jar) => ({
      id:
        Crypto.randomUUID(),

      ...jar,
    }),
  );
}


export function SixJarSetupScreen() {
  const router =
    useRouter();

  const profileQuery =
    useSixJarProfile();

  const reference =
    useLocalFinanceReferenceData();

  const saveProfile =
    useSaveSixJarProfile();


  const [
    initialized,
    setInitialized,
  ] =
    useState(
      false,
    );

  const [
    profileId,
    setProfileId,
  ] =
    useState(
      Crypto.randomUUID(),
    );

  const [
    profileName,
    setProfileName,
  ] =
    useState(
      'My Six Jars',
    );

  const [
    currencyCode,
    setCurrencyCode,
  ] =
    useState('');

  const [
    jars,
    setJars,
  ] =
    useState<EditableJar[]>(
      newClassicJars,
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<string | null>(
      null,
    );


  const currencies = useMemo(
    () => reference.data
      ?.currencies ?? [],
    [reference.data
      ?.currencies],
  );


  useEffect(() => {
    if (
      initialized
      || profileQuery.isLoading
    ) {
      return;
    }

    const profile =
      profileQuery.data;

    if (profile) {
      // Server profile data intentionally hydrates the editable Six Jars form once available.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfileId(
        profile.id,
      );

      setProfileName(
        profile.name,
      );

      setCurrencyCode(
        profile.currency_code,
      );

      setJars(
        profile.jars.map(
          (jar) => ({
            id:
              jar.id,

            name:
              jar.name,

            code:
              jar.code,

            percentageText:
              basisPointsToPercentText(
                jar.percentage_basis_points,
              )
                .replace(
                  /%$/,
                  '',
                ),

            sortOrder:
              jar.sort_order,
          }),
        ),
      );
    }
    else if (
      currencies.length > 0
    ) {
      setCurrencyCode(
        currencies[0].code,
      );
    }

    setInitialized(
      true,
    );
  }, [
    initialized,
    profileQuery.data,
    profileQuery.isLoading,
    currencies,
  ]);


  useEffect(() => {
    if (
      currencyCode
      || currencies.length === 0
    ) {
      return;
    }

    // Currency reference data intentionally seeds the editable form once available.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrencyCode(
      currencies[0].code,
    );
  }, [
    currencyCode,
    currencies,
  ]);


  const totalBasisPoints =
    useMemo(
      () => {
        try {
          return sumBasisPoints(
            jars.map(
              (jar) =>
                percentTextToBasisPoints(
                  jar.percentageText,
                ),
            ),
          );
        } catch {
          return null;
        }
      },
      [
        jars,
      ],
    );


  const totalPercentText =
    totalBasisPoints === null
      ? 'Invalid'
      : basisPointsToPercentText(
          totalBasisPoints,
        );


  const totalIsValid =
    totalBasisPoints ===
      '10000';


  function updateJar(
    id: string,
    patch:
      Partial<EditableJar>,
  ) {
    setJars(
      (current) =>
        current.map(
          (jar) =>
            jar.id === id
              ? {
                  ...jar,
                  ...patch,
                }
              : jar,
        ),
    );
  }


  function resetClassic() {
    setJars(
      newClassicJars(),
    );

    setErrorMessage(
      null,
    );
  }


  async function save() {
    setErrorMessage(
      null,
    );

    try {
      if (
        !profileName.trim()
      ) {
        throw new Error(
          'Enter a profile name.',
        );
      }

      if (
        !currencyCode
      ) {
        throw new Error(
          'Choose a currency.',
        );
      }

      const preparedJars =
        jars.map(
          (jar) => {
            if (
              !jar.name.trim()
            ) {
              throw new Error(
                'Every jar needs a name.',
              );
            }

            return {
              id:
                jar.id,

              name:
                jar.name.trim(),

              code:
                jar.code,

              percentageBasisPoints:
                percentTextToBasisPoints(
                  jar.percentageText,
                ),

              sortOrder:
                jar.sortOrder,
            };
          },
        );


      if (
        sumBasisPoints(
          preparedJars.map(
            (jar) =>
              jar.percentageBasisPoints,
          ),
        )
        !==
        '10000'
      ) {
        throw new Error(
          'Jar percentages must total exactly 100%.',
        );
      }


      await saveProfile
        .mutateAsync({
          profileId,

          name:
            profileName.trim(),

          currencyCode,

          jars:
            preparedJars,
        });


      router.back();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Could not save the Six-Jar setup.',
      );
    }
  }


  if (
    profileQuery.isLoading
    || !initialized
  ) {
    return (
      <View
        style={
          styles.centered
        }
      >
        <Text
          style={
            styles.muted
          }
        >
          Loading setup…
        </Text>
      </View>
    );
  }


  return (
    <ScrollView
      style={
        styles.screen
      }
      contentContainerStyle={
        styles.content
      }
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text
        style={
          styles.eyebrow
        }
      >
        SIX-JAR SETUP
      </Text>

      <Text
        style={
          styles.title
        }
      >
        Define your allocation rules.
      </Text>

      <Text
        style={
          styles.subtitle
        }
      >
        Percentages must total exactly 100%. You can change the jar names and split whenever your plan changes.
      </Text>


      <Text
        style={
          styles.label
        }
      >
        Profile name
      </Text>

      <TextInput
        value={
          profileName
        }
        onChangeText={
          setProfileName
        }
        placeholder="My Six Jars"
        style={
          styles.input
        }
      />


      <Text
        style={
          styles.label
        }
      >
        Planning currency
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

                currency.code ===
                  currencyCode
                  ? styles.chipSelected
                  : null,
              ]}
            >
              <Text
                style={[
                  styles.chipText,

                  currency.code ===
                    currencyCode
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


      <View
        style={
          styles.jarHeading
        }
      >
        <Text
          style={
            styles.label
          }
        >
          Jar percentages
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={
            resetClassic
          }
        >
          <Text
            style={
              styles.resetText
            }
          >
            Reset classic split
          </Text>
        </Pressable>
      </View>


      <View
        style={
          styles.jarList
        }
      >
        {jars.map(
          (jar) => (
            <View
              key={
                jar.id
              }
              style={
                styles.jarRow
              }
            >
              <View
                style={
                  styles.jarNameColumn
                }
              >
                <TextInput
                  value={
                    jar.name
                  }
                  onChangeText={
                    (value) => {
                      updateJar(
                        jar.id,
                        {
                          name:
                            value,
                        },
                      );
                    }
                  }
                  placeholder="Jar name"
                  style={
                    styles.jarNameInput
                  }
                />

                <Text
                  style={
                    styles.jarCode
                  }
                >
                  {jar.code}
                </Text>
              </View>

              <View
                style={
                  styles.percentInputWrap
                }
              >
                <TextInput
                  value={
                    jar.percentageText
                  }
                  onChangeText={
                    (value) => {
                      updateJar(
                        jar.id,
                        {
                          percentageText:
                            value,
                        },
                      );
                    }
                  }
                  keyboardType="decimal-pad"
                  style={
                    styles.percentInput
                  }
                />

                <Text
                  style={
                    styles.percentSymbol
                  }
                >
                  %
                </Text>
              </View>
            </View>
          ),
        )}
      </View>


      <View
        style={[
          styles.totalCard,

          totalIsValid
            ? styles.totalCardValid
            : styles.totalCardInvalid,
        ]}
      >
        <Text
          style={
            styles.totalLabel
          }
        >
          Total allocation
        </Text>

        <Text
          style={[
            styles.totalValue,

            totalIsValid
              ? styles.totalValueValid
              : styles.totalValueInvalid,
          ]}
        >
          {totalPercentText}
        </Text>
      </View>


      {errorMessage ? (
        <View
          style={
            styles.errorCard
          }
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


      <Pressable
        accessibilityRole="button"
        disabled={
          !totalIsValid
          || saveProfile.isPending
          || !currencyCode
        }
        onPress={() => {
          void save();
        }}
        style={[
          styles.saveButton,

          (
            !totalIsValid
            || saveProfile.isPending
            || !currencyCode
          )
            ? styles.disabled
            : null,
        ]}
      >
        <Text
          style={
            styles.saveButtonText
          }
        >
          {saveProfile.isPending
            ? 'Saving…'
            : 'Save Six-Jar setup'}
        </Text>
      </Pressable>


      <Text
        style={
          styles.disclaimer
        }
      >
        Saving this setup changes planning rules only. It does not move funds or edit your financial ledger.
      </Text>
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
      paddingHorizontal: layout.screenHorizontalPadding,
      paddingTop: 22,
      paddingBottom: 120,
    },

    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
      backgroundColor: colors.background,
    },

    muted: {
      color: colors.textSecondary,
      fontSize: typography.small,
    },

    eyebrow: {
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
      letterSpacing: 1.4,
    },

    title: {
      marginTop: 8,
      color: colors.text,
      fontSize: typography.title,
      lineHeight: 35,
      fontWeight: typography.weightBold,
    },

    subtitle: {
      marginTop: 8,
      marginBottom: 18,
      color: colors.textSecondary,
      fontSize: typography.small,
      lineHeight: 21,
    },

    label: {
      marginTop: 18,
      marginBottom: 8,
      color: colors.text,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    input: {
      minHeight: 52,
      paddingHorizontal: 14,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      color: colors.text,
      fontSize: typography.small,
    },

    chips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    chip: {
      paddingHorizontal: 13,
      paddingVertical: 10,
      borderRadius: radii.pill,
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
      fontSize: typography.small,
      fontWeight: typography.weightSemibold,
    },

    chipTextSelected: {
      color: colors.primary,
      fontWeight: typography.weightBold,
    },

    jarHeading: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 12,
    },

    resetText: {
      marginBottom: 8,
      color: colors.primary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    jarList: {
      gap: 9,
    },

    jarRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      padding: 12,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      ...elevation.card
    },

    jarNameColumn: {
      flex: 1,
    },

    jarNameInput: {
      paddingVertical: 3,
      color: colors.text,
      fontSize: typography.small,
      fontWeight: typography.weightBold,
    },

    jarCode: {
      marginTop: 2,
      color: colors.textTertiary,
      fontSize: 9,
    },

    percentInputWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      minWidth: 82,
      paddingHorizontal: 10,
      borderRadius: radii.sm,
      backgroundColor: colors.surfaceMuted,
    },

    percentInput: {
      flex: 1,
      minHeight: layout.touchTarget,
      textAlign: 'right',
      color: colors.primary,
      fontSize: typography.body,
      fontWeight: typography.weightBold,
    },

    percentSymbol: {
      marginLeft: 3,
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    totalCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 15,
      padding: 14,
      borderRadius: radii.md,
      borderWidth: 1,
      ...elevation.card
    },

    totalCardValid: {
      backgroundColor: colors.successSurface,
      borderColor: colors.accentStrong,
    },

    totalCardInvalid: {
      backgroundColor: colors.dangerSurface,
      borderColor: colors.danger,
    },

    totalLabel: {
      color: colors.textSecondary,
      fontSize: typography.caption,
      fontWeight: typography.weightBold,
    },

    totalValue: {
      fontSize: typography.subheading,
      fontWeight: typography.weightBold,
    },

    totalValueValid: {
      color: colors.primary,
    },

    totalValueInvalid: {
      color: colors.danger,
    },

    errorCard: {
      marginTop: 14,
      padding: 13,
      borderRadius: radii.md,
      backgroundColor: colors.dangerSurface,
    },

    errorText: {
      color: colors.danger,
      fontSize: typography.small,
      lineHeight: 18,
    },

    saveButton: {
      minHeight: 54,
      marginTop: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.md,
      backgroundColor: colors.primary,
    },

    disabled: {
      opacity: 0.45,
    },

    saveButtonText: {
      color: colors.textOnPrimary,
      fontSize: typography.body,
      fontWeight: typography.weightBold,
    },

    disclaimer: {
      marginTop: 12,
      color: colors.textTertiary,
      fontSize: typography.caption,
      lineHeight: 16,
      textAlign: 'center',
    },
  });