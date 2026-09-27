import {
  supabase,
} from '../../lib/supabase';

import {
  dashboardSummarySchema,
  type DashboardSummary,
} from './dashboard-contract';


type RpcResult = {
  data: unknown;

  error: {
    message: string;
    code?: string;
  } | null;
};


const callRpc =
  supabase.rpc.bind(
    supabase,
  ) as unknown as (
    functionName: string,
    args?: Record<
      string,
      unknown
    >,
  ) => Promise<RpcResult>;


export async function
getFinancialDashboardSummary(
  asOf?: string,
): Promise<DashboardSummary> {
  const {
    data,
    error,
  } =
    await callRpc(
      'get_financial_dashboard_summary',
      asOf
        ? {
            p_as_of:
              asOf,
          }
        : {},
    );


  if (error) {
    throw new Error(
      error.message,
    );
  }


  return dashboardSummarySchema
    .parse(
      data,
    );
}