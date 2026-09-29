import type { DashboardSummary } from '@/features/dashboard/dashboard-contract';
import type { BudgetStatus } from '@/features/budgets/budget-contract';

export function attentionBudgets(budgets: BudgetStatus[], today: string) {
  return budgets.filter(budget => budget.period_start <= today && budget.period_end >= today
    && (budget.is_over_budget || BigInt(budget.usage_basis_points) >= 8000n))
    .sort((a, b) => {
      if (a.is_over_budget !== b.is_over_budget) return a.is_over_budget ? -1 : 1;
      const difference = BigInt(b.usage_basis_points) - BigInt(a.usage_basis_points);
      return difference === 0n ? a.name.localeCompare(b.name) : difference > 0n ? 1 : -1;
    });
}

export function homeInsight(summary: DashboardSummary, currency: string) {
  const over = BigInt(summary.budgets.over_budget_count);
  const near = BigInt(summary.budgets.near_limit_count);
  if (over > 0n) return {
    title: `${over} budget${over === 1n ? '' : 's'} over the limit`,
    body: 'Review your spending limits before your next purchase.',
    prompt: 'Which of my budgets are over their limits, and what practical adjustments can I make this month?',
  };
  if (near > 0n) return {
    title: `${near} budget${near === 1n ? '' : 's'} close to the limit`,
    body: 'At least 80% used. Check what is left before spending more.',
    prompt: 'Which of my budgets have used at least 80% of their limits, and how can I pace the remaining spending?',
  };
  const flow = summary.cash_flow_by_currency.find(row => row.currency_code === currency);
  if (flow && BigInt(flow.net_minor) < 0n) return {
    title: `Spending exceeds income in ${currency}`,
    body: 'This month’s recorded expenses are higher than recorded income.',
    prompt: `Review my ${currency} cash flow this month. Why do recorded expenses exceed income, and what could I adjust? Keep other currencies separate.`,
  };
  const reached = BigInt(summary.goals.target_reached_count);
  if (reached > 0n) return {
    title: `${reached} goal${reached === 1n ? '' : 's'} reached the target`,
    body: 'Review your progress and choose the next saving priority.',
    prompt: 'Which savings goals have reached their targets, and how could I choose my next savings priority?',
  };
  return {
    title: 'Make room for your next goal',
    body: 'Ask Coach to review your recorded spending and saving options.',
    prompt: `Review my finances${currency ? ` in ${currency}` : ''} this month. What is one realistic saving opportunity based on my data?`,
  };
}
