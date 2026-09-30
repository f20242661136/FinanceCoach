import { useCallback, useEffect, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useFocusEffect } from 'expo-router';
import { useNetInfo } from '@react-native-community/netinfo';
import { useAuth } from '@/features/auth/auth-context';
import { todayInZone } from '@/features/activity/activity-model';
import type { Direction, RepaymentCursor } from './debt-model';
import { fetchDebtSnapshot, fetchRepaymentPage, readDebtDirty, readSavedDebt, readSavedRepayments } from './debt-service';

export function useDebtDashboard(direction:Direction){
  const db=useSQLiteContext();const {session,profile}=useAuth();const user=session?.user.id??'';
  const network=useNetInfo();const timezone=profile?.timezone??'UTC';
  const [today,setToday]=useState(()=>todayInZone(new Date(),timezone));
  const options={retry:false,networkMode:'always' as const,enabled:Boolean(user)};
  const saved=useQuery({...options,queryKey:['debt-dashboard','saved',user],queryFn:()=>readSavedDebt(db,user),staleTime:Infinity});
  const dirty=useQuery({...options,queryKey:['debt-dashboard','dirty',user],queryFn:()=>readDebtDirty(db,user),staleTime:Infinity});
  const live=useQuery({...options,enabled:Boolean(user)&&!saved.isPending,queryKey:['debt-dashboard','live',user,today],
    queryFn:()=>fetchDebtSnapshot(db,user,today),staleTime:30000});
  const historyFirst=useQuery({...options,queryKey:['debt-dashboard','history-saved',user,direction],
    queryFn:()=>readSavedRepayments(db,user,direction,null),staleTime:Infinity});
  const history=useInfiniteQuery({...options,enabled:Boolean(user)&&!historyFirst.isPending,queryKey:['debt-dashboard','history',user,direction],
    initialPageParam:null as RepaymentCursor,queryFn:({pageParam})=>fetchRepaymentPage(db,user,direction,pageParam),
    getNextPageParam:page=>page.value.next,staleTime:30000});
  const refreshLive=live.refetch,refreshHistory=history.refetch,refreshDirty=dirty.refetch,refreshSaved=saved.refetch;
  useEffect(()=>{if(live.dataUpdatedAt){void refreshDirty();void refreshSaved();}},[live.dataUpdatedAt,refreshDirty,refreshSaved]);
  const tick=useCallback(()=>setToday(todayInZone(new Date(),timezone)),[timezone]);
  useFocusEffect(useCallback(()=>{
    tick();const interval=setInterval(tick,60000);return()=>clearInterval(interval);
  },[tick]));
  useFocusEffect(useCallback(()=>{
    // Return from an existing loan detail/payment screen with current dashboard data.
    if(user && saved.isSuccess)void refreshLive();
    if(user && historyFirst.isSuccess)void refreshHistory();
  // refetch functions are stable query observers; data changes must not create a refresh loop.
  },[user,saved.isSuccess,historyFirst.isSuccess,refreshLive,refreshHistory]));
  useEffect(()=>{
    if(network.isConnected===true && network.isInternetReachable!==false && saved.isSuccess){void refreshLive();if(historyFirst.isSuccess)void refreshHistory();}
  },[network.isConnected,network.isInternetReachable,saved.isSuccess,historyFirst.isSuccess,refreshLive,refreshHistory]);
  const data=live.data??saved.data;
  async function refresh(){await Promise.allSettled([live.refetch(),history.refetch(),dirty.refetch()]);}
  return {user,today,data,saved,dirty,live,history,historyFirst,network,refresh};
}
