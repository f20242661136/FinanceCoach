import {
  useQuery,
} from '@tanstack/react-query';

import {
  getFinancialDashboardSummary,
} from './dashboard-service';


export const dashboardKeys = {
  all:
    [
      'dashboard',
    ] as const,

  summary:
    (
      asOf?: string,
    ) =>
      [
        'dashboard',
        'summary',
        asOf ?? 'today',
      ] as const,
};


export function
useFinancialDashboardSummary(
  asOf?: string,
) {
  return useQuery({
    queryKey:
      dashboardKeys.summary(
        asOf,
      ),

    queryFn:
      () =>
        getFinancialDashboardSummary(
          asOf,
        ),

    retry:
      1,

    staleTime:
      30_000,
  });
}