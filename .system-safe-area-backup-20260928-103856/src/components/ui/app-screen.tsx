import type {
  PropsWithChildren,
  ReactNode,
} from 'react';

import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  colors,
  layout,
  spacing,
} from '@/design/tokens';

type AppScreenProps =
  PropsWithChildren<{
    header?: ReactNode;
    footer?: ReactNode;
    scroll?: boolean;
    keyboardAware?: boolean;
    contentStyle?:
      StyleProp<ViewStyle>;
    scrollContentStyle?:
      StyleProp<ViewStyle>;
    keyboardShouldPersistTaps?:
      ScrollViewProps['keyboardShouldPersistTaps'];
    keyboardDismissMode?:
      ScrollViewProps['keyboardDismissMode'];
    testID?: string;
  }>;

export function AppScreen({
  children,
  header,
  footer,
  scroll = true,
  keyboardAware = false,
  contentStyle,
  scrollContentStyle,
  keyboardShouldPersistTaps = 'handled',
  keyboardDismissMode =
    Platform.OS === 'ios'
      ? 'interactive'
      : 'on-drag',
  testID,
}: AppScreenProps) {
  const content = (
    <View
      style={[
        styles.content,
        contentStyle,
      ]}
    >
      {header}

      <View style={styles.main}>
        {children}
      </View>

      {footer}
    </View>
  );

  const body =
    scroll
      ? (
          <ScrollView
            testID={testID}
            contentContainerStyle={[
              styles.scrollContent,
              scrollContentStyle,
            ]}
            keyboardShouldPersistTaps={
              keyboardShouldPersistTaps
            }
            keyboardDismissMode={
              keyboardDismissMode
            }
            automaticallyAdjustKeyboardInsets={
              Platform.OS === 'ios'
              && keyboardAware
            }
            showsVerticalScrollIndicator={false}
          >
            {content}
          </ScrollView>
        )
      : (
          <View
            testID={testID}
            style={styles.flex}
          >
            {content}
          </View>
        );

  return (
    <SafeAreaView style={styles.safeArea}>
      {keyboardAware ? (
        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }
          style={styles.flex}
        >
          {body}
        </KeyboardAvoidingView>
      ) : body}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  safeArea: {
    flex: 1,
    backgroundColor:
      colors.background,
  },

  scrollContent: {
    flexGrow: 1,
  },

  content: {
    width: '100%',
    maxWidth:
      layout.contentMaxWidth,
    alignSelf: 'center',
    flex: 1,
    paddingHorizontal:
      layout.screenHorizontalPadding,
    paddingVertical:
      layout.screenVerticalPadding,
    gap: spacing.lg,
  },

  main: {
    gap: spacing.lg,
  },
});