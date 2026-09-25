export const copy = {
  brand: {
    name: 'Finance Coach',
    tagline: 'Your calm financial command center.',
  },

  common: {
    continue: 'Continue',
    retry: 'Try again',
    signOut: 'Sign out',
    loading: 'Loading your secure workspaceâ€¦',
    privateByDesign: 'Private by design',
  },

  auth: {
    signIn: {
      eyebrow: 'Welcome back',
      title: 'Your money, clearly understood.',
      subtitle:
        'Sign in to continue to your private financial workspace.',
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Enter your password',
      submit: 'Sign in securely',
      noAccount: 'New here?',
      createAccount: 'Create an account',
      trust:
        'Your financial records are protected by account-level access controls.',
    },

    signUp: {
      eyebrow: 'Create your workspace',
      title: 'Build better financial habits from one place.',
      subtitle:
        'Start with a secure account. You will choose your financial preferences next.',
      nameLabel: 'Name',
      namePlaceholder: 'How should we address you?',
      emailLabel: 'Email',
      emailPlaceholder: 'you@example.com',
      passwordLabel: 'Password',
      passwordPlaceholder: 'Use at least 8 characters',
      passwordHint:
        'Use 8 or more characters. A password manager is recommended.',
      submit: 'Create secure account',
      existingAccount: 'Already have an account?',
      signIn: 'Sign in',
      consent:
        'By continuing, you agree to use Finance Coach as a personal financial management tool, not a bank or investment service.',
    },

    verify: {
      eyebrow: 'Check your inbox',
      title: 'Verify your email',
      body:
        'We sent a confirmation link to your email address. Open it to verify your account, then return and sign in.',
      resend: 'Resend verification email',
      resent: 'Verification email sent again.',
      back: 'Back to sign in',
    },

    errors: {
      generic:
        'We could not complete that request. Please try again.',
      invalidCredentials:
        'The email or password is incorrect.',
      alreadyRegistered:
        'An account already exists for this email.',
      network:
        'We could not reach the secure service. Check your connection and try again.',
    },
  },

  onboarding: {
    eyebrow: '1-minute setup',
    title: 'Set your financial home base.',
    subtitle:
      'Choose the currency you mainly think and plan in. You can change this later.',
    currencyTitle: 'Primary currency',
    currencyBody:
      'This controls how your overall financial experience is presented. Individual accounts can still use other currencies.',
    detectedPreferences: 'Detected preferences',
    locale: 'Locale',
    timezone: 'Timezone',
    continue: 'Finish setup',
    loadingCurrencies: 'Loading supported currenciesâ€¦',
    noCurrencies:
      'Supported currencies could not be loaded.',
    privacy:
      'These preferences stay with your account and help format dates, numbers, and financial information correctly.',
  },

  home: {
    eyebrow: 'Secure workspace',
    greeting: 'Welcome',
    title: 'Your financial foundation is ready.',
    body:
      'Accounts and transaction entry are the next product layer. We are not showing fake balances or placeholder financial data.',
    currency: 'Primary currency',
    privacyTitle: 'Private by default',
    privacyBody:
      'Your account is isolated from other users at the database level.',
    correctnessTitle: 'Built for financial correctness',
    correctnessBody:
      'Balances will come from the ledgerâ€”not from editable dashboard numbers.',
    nextTitle: 'Next build gate',
    nextBody:
      'Accounts, transaction entry, and the first real financial dashboard.',
  },

  profileError: {
    title: 'We could not load your financial profile.',
    body:
      'Your session is secure, but the profile service did not respond correctly. Retry before continuing.',
  },
} as const;