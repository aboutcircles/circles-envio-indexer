import { GlobalStats, GlobalStatsV1, handlerContext } from "generated";

export async function incrementStatsV1(context: handlerContext, field: 'signups' | 'transfers' | 'trusts'): Promise<GlobalStatsV1> {
    let stats = await context.GlobalStatsV1.get('0');
  
    if(!stats) {
      stats = {
        id: '0',
        signups: 0n,
        transfers: 0n,
        trusts: 0n,
      };
    }
  
    return {
      ...stats,
      [field]: stats[field] + 1n,
    };
  }

export async function incrementStats(context: handlerContext, field: 'signups' | 'transfers' | 'trusts'): Promise<GlobalStats> {
    let stats = await context.GlobalStats.get('0');
  
    if(!stats) {
      stats = {
        id: '0',
        signups: 0n,
        transfers: 0n,
        trusts: 0n,
      };
    }
  
    return {
      ...stats,
      [field]: stats[field] + 1n,
    };
  }