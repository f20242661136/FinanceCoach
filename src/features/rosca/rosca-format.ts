import type {
  RoscaFrequency,
} from './rosca-contract';


export function
roscaFrequencyLabel(
  frequency:
    RoscaFrequency,
): string {
  return frequency ===
    'weekly'
    ? 'Weekly'
    : 'Monthly';
}


export function
roscaStatusLabel(
  status:
    'forming'
    | 'active'
    | 'completed'
    | 'archived',
): string {
  switch (status) {
    case 'forming':
      return 'Forming';

    case 'active':
      return 'Active';

    case 'completed':
      return 'Completed';

    case 'archived':
      return 'Archived';
  }
}