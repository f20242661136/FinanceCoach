import type { BudgetStatus } from '@/features/budgets/budget-contract';
import type { SavingsGoalSummary } from '@/features/goals/savings-goal-contract';
import type { LoanSummary } from '@/features/loans/loan-contract';
import type { RoscaGroupSummary } from '@/features/rosca/rosca-contract';

export type PlanAction = {
  id: string;
  title: string;
  detail: string;
  actionLabel: string;
  route: string;
  params?: Record<string, string>;
  priority: number;
  date?: string;
  currency?: string;
  amountMinor?: string;
  amountLabel?: string;
};

export function daysBetween(today: string, date: string): number {
  return Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86_400_000);
}

export function dueLabel(today: string, date: string): string {
  const days = daysBetween(today, date);
  return days < 0 ? `${Math.abs(days)} day${days === -1 ? '' : 's'} past date`
    : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`;
}

export function progressPercent(basisPoints: string): number {
  const value = BigInt(basisPoints);
  return Number(value < 0n ? 0n : value > 10000n ? 10000n : value) / 100;
}

export function buildPlanOverview(input: {
  today: string;
  budgets?: BudgetStatus[];
  goals?: SavingsGoalSummary[];
  loans?: LoanSummary[];
  groups?: RoscaGroupSummary[];
}) {
  const { today } = input;
  const budgets = input.budgets?.filter(budget => budget.period_start <= today && budget.period_end >= today);
  const goals = input.goals?.filter(goal => goal.status === 'active');
  const loans = input.loans?.filter(loan => ['active', 'defaulted'].includes(loan.status) && BigInt(loan.remaining_minor) > 0n);
  const groups = input.groups?.filter(group => group.status === 'active');
  const attention: PlanAction[] = [];
  const upcoming: PlanAction[] = [];
  for (const budget of budgets ?? []) {
    if (!budget.is_over_budget && BigInt(budget.usage_basis_points) < 8000n) continue;
    const over = BigInt(budget.remaining_minor) < 0n;
    attention.push({ id: `budget:${budget.id}`, title: budget.name,
      detail: budget.is_over_budget ? 'Budget over its limit' : 'At least 80% of the budget used',
      actionLabel: 'Review budget', route: '/budgets', priority: budget.is_over_budget ? 2 : 4,
      currency: budget.currency_code, amountMinor: (over ? -BigInt(budget.remaining_minor) : BigInt(budget.remaining_minor)).toString(),
      amountLabel: over ? 'over' : 'left' });
  }
  for (const goal of goals ?? []) {
    if (goal.is_target_reached || !goal.target_date) continue;
    const days = daysBetween(today, goal.target_date);
    const item: PlanAction = { id: `goal:${goal.id}`, title: goal.name,
      detail: days < 0 ? 'Target date passed · goal not yet reached' : `Goal target · ${dueLabel(today, goal.target_date)}`,
      actionLabel: 'Review goal', route: '/goal-detail', params: { goalId: goal.id }, priority: 3,
      date: goal.target_date, currency: goal.currency_code, amountMinor: goal.remaining_minor, amountLabel: 'to target' };
    if (days < 0) attention.push(item); else if (days <= 7) upcoming.push(item);
  }
  for (const loan of loans ?? []) {
    const overdue = Boolean(loan.due_date && loan.due_date < today);
    const review = overdue || loan.status === 'defaulted';
    const item: PlanAction = { id: `loan:${loan.id}`, title: loan.counterparty_name,
      detail: loan.status === 'defaulted' ? 'Loan marked as defaulted'
        : `${loan.direction === 'borrowed' ? 'Repayment' : 'Expected repayment'}${overdue ? ' date passed' : loan.due_date ? ` · ${dueLabel(today, loan.due_date)}` : ''}`,
      actionLabel: 'Review loan', route: '/loan-detail', params: { loanId: loan.id }, priority: 0,
      date: loan.due_date ?? undefined, currency: loan.currency_code, amountMinor: loan.remaining_minor, amountLabel: 'outstanding' };
    if (review) attention.push(item);
    else if (loan.due_date && daysBetween(today, loan.due_date) <= 7) upcoming.push(item);
  }
  for (const group of groups ?? []) {
    if (!group.next_due_date) continue;
    const days = daysBetween(today, group.next_due_date);
    const item: PlanAction = { id: `rosca:${group.id}`, title: group.name,
      detail: days < 0 ? 'Open group cycle has passed its date · review cycle status' : `Group cycle · ${dueLabel(today, group.next_due_date)}`,
      actionLabel: 'Review group', route: '/rosca-detail', params: { groupId: group.id }, priority: 1, date: group.next_due_date };
    // A cycle date is not evidence that the user personally missed a payment.
    if (days < 0) attention.push(item); else if (days <= 7) upcoming.push(item);
  }
  attention.sort((a, b) => a.priority - b.priority || (a.date ?? today).localeCompare(b.date ?? today) || a.title.localeCompare(b.title));
  upcoming.sort((a, b) => (a.date ?? today).localeCompare(b.date ?? today) || a.priority - b.priority || a.title.localeCompare(b.title));
  const sourcesComplete = [input.budgets, input.goals, input.loans, input.groups].every(source => source !== undefined);
  return {
    attention, upcoming, sourcesComplete,
    steadyBudgetCount: budgets?.filter(budget => !budget.is_over_budget && BigInt(budget.usage_basis_points) < 8000n).length,
    activeGoalCount: goals?.length,
    reachedGoals: goals?.filter(goal => goal.is_target_reached) ?? [],
    activeGoals: goals?.filter(goal => !goal.is_target_reached) ?? [],
    activeLoanCount: loans?.length,
    activeGroupCount: groups?.length,
    activeBudgetCount: budgets?.length,
  };
}
