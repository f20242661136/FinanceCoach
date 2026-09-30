import type { SQLiteDatabase } from 'expo-sqlite';
import { replayQueuedMutations } from '@/offline/sync/mutation-replay';
import { assertCSVUser } from './csv-service';
import { yieldToUI } from './csv-model';
export async function syncCSVQueue(db:SQLiteDatabase,user:string,progress:(n:number)=>void=()=>{},cancelled:()=>boolean=()=>false) {
  let completed=0;
  for(let pass=0;pass<1000&&!cancelled();pass++) {
    await assertCSVUser(user); const result=await replayQueuedMutations(db,user);completed+=result.completed;progress(completed);
    if(result.failed>0)throw Error('Some rows could not sync. Saved rows are kept; review the report and retry after resolving the error.');
    if(result.attempted===0)break;
    if(pass===999)throw Error('Sync paused after 1,000 passes. Review the report and sync again for any remaining rows.');
    await yieldToUI();
  }
  return completed;
}
