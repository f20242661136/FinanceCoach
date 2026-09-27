export function
gamificationEventLabel(
  eventType: string,
): string {
  switch (eventType) {
    case 'transaction_logged':
      return 'Transaction logged';

    case 'budget_created':
      return 'Budget created';

    case 'goal_created':
      return 'Goal created';

    case 'savings_contribution_logged':
      return 'Savings contribution';

    case 'goal_completed':
      return 'Goal completed';

    case 'challenge_completed':
      return 'Challenge completed';

    case 'logging_streak_7':
      return '7-day logging streak';

    case 'logging_streak_30':
      return '30-day logging streak';

    case 'saving_streak_4':
      return 'Saving streak';

    case 'challenge_streak_7':
      return 'Challenge streak';

    default:
      return eventType
        .replace(
          /_/g,
          ' ',
        );
  }
}


export function
gamificationStreakLabel(
  streakType:
    'daily_logging'
    | 'saving'
    | 'challenge',
): string {
  switch (streakType) {
    case 'daily_logging':
      return 'Logging';

    case 'saving':
      return 'Saving';

    case 'challenge':
      return 'Challenges';
  }
}