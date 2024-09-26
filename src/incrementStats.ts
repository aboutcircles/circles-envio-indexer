import { handlerContext } from "generated";

export async function incrementStats(context: handlerContext, field: 'signups' | 'transfers' | 'trusts'): Promise<void> {
    let stats = await context.GlobalStats.get('0');
  
    if(!stats) {
      stats = {
        id: '0',
        signups: 0n,
        transfers: 0n,
        trusts: 0n,
      };
    }
  
    context.GlobalStats.set({
      ...stats,
      [field]: stats[field] + 1n,
    });
  }