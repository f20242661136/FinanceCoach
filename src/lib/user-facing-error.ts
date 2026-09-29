export type UserFacingErrorContext =
  | 'generic'
  | 'onboarding'
  | 'account'
  | 'transaction'
  | 'budget'
  | 'goal'
  | 'loan'
  | 'rosca'
  | 'notifications'
  | 'subscription';

function technicalMessage(
  error: unknown,
): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === 'object'
    && error !== null
    && 'message' in error
    && typeof error.message === 'string'
  ) {
    return error.message;
  }

  return '';
}

function technicalCode(
  error: unknown,
): string {
  if (
    typeof error === 'object'
    && error !== null
    && 'code' in error
    && typeof error.code === 'string'
  ) {
    return error.code;
  }

  return '';
}

const fallbackByContext:
  Record<
    UserFacingErrorContext,
    string
  > = {
    generic:
      'We could not complete that action. Please try again.',
    onboarding:
      'We could not finish setup. Your preferences were not confirmed. Please try again.',
    account:
      'We could not save this account. Your changes were not confirmed. Please try again.',
    transaction:
      'We could not save this transaction. Your changes were not confirmed. Please try again.',
    budget:
      'We could not save this budget. Your changes were not confirmed. Please try again.',
    goal:
      'We could not save this goal update. Your changes were not confirmed. Please try again.',
    loan:
      'We could not save this loan update. Your changes were not confirmed. Please try again.',
    rosca:
      'We could not complete this ROSCA action. Your changes were not confirmed. Please try again.',
    notifications:
      'We could not update notification settings. Please try again.',
    subscription:
      'We could not update your subscription status. Please try again.',
  };

export function toUserFacingError(
  error: unknown,
  context:
    UserFacingErrorContext =
      'generic',
): string {
  const message =
    technicalMessage(error)
      .toLowerCase();

  const code =
    technicalCode(error)
      .toLowerCase();

  if (
    message.includes('network')
    || message.includes('fetch')
    || message.includes('timeout')
    || message.includes('timed out')
    || message.includes('connection')
    || message.includes('offline')
  ) {
    return 'Finance Coach could not reach the server. Check your connection and try again.';
  }

  if (
    message.includes('jwt')
    || message.includes('session expired')
    || message.includes('refresh token')
    || message.includes('not authenticated')
    || code === 'pgrst301'
  ) {
    return 'Your session has expired. Sign in again, then retry this action.';
  }

  if (
    code === '23505'
    || message.includes('duplicate key')
    || message.includes('already exists')
    || message.includes('unique constraint')
  ) {
    return 'That item already exists. Review the details and try again.';
  }

  if (
    code === '42501'
    || message.includes('row-level security')
    || message.includes('permission denied')
    || message.includes('not authorized')
    || message.includes('unauthorized')
  ) {
    return 'You do not have permission to complete this action. Refresh the app and try again.';
  }

  if (
    code === '23503'
    || message.includes('foreign key')
  ) {
    return 'One of the selected items is no longer available. Refresh the screen and try again.';
  }

  if (
    code === '23514'
    || message.includes('check constraint')
  ) {
    return 'Some information is not valid for this action. Review the fields and try again.';
  }

  return fallbackByContext[
    context
  ];
}