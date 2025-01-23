import { handlerContext } from "generated";
import { zeroAddress } from "viem";
import { makeAvatarBalanceEntityId } from "../utils";
import { AvatarBalance_t } from "generated/src/db/Entities.gen";

export const updateAvatarBalance = (
  avatarBalance: AvatarBalance_t | { avatar_id: string, token_id: string },
  context: handlerContext,
  amount: bigint,
  blockTimestamp: number
) => {
  const { avatar_id: avatarId, token_id: tokenId } = avatarBalance;
  if (avatarId === zeroAddress || !avatarId || !tokenId) {
    return;
  }
  const avatarBalanceId = makeAvatarBalanceEntityId(avatarId, tokenId);
  if ('balance' in avatarBalance) {
    context.AvatarBalance.set({
      ...avatarBalance,
      balance: avatarBalance.balance + amount,
      computedValue: avatarBalance.computedValue + amount,
      lastCalculated: blockTimestamp,
    });
  } else {
    context.AvatarBalance.set({
      id: avatarBalanceId,
      avatar_id: avatarId,
      token_id: tokenId,
      balance: amount,
      computedValue: 0n,
      lastCalculated: blockTimestamp,
    });
  }
};
