import { GlobalStats, handlerContext } from "generated";

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