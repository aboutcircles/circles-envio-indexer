import {
  eventLog,
  handlerContext,
  WrappedERC20,
  WrappedERC20_DepositInflationary_eventArgs,
  WrappedERC20_WithdrawInflationary_eventArgs,
  WrappedERC20_DepositDemurraged_eventArgs,
  WrappedERC20_WithdrawDemurraged_eventArgs,
} from "generated";
import { handleTransfer } from "../common/handleTransfer";
import { makeAvatarBalanceEntityId } from "../utils";

WrappedERC20.Transfer.handlerWithLoader({
  loader: async ({ event, context }) => {
    const tokenId = event.srcAddress;
    const avatarBalanceIdTo = makeAvatarBalanceEntityId(
      event.params.to,
      tokenId
    );
    const avatarBalanceIdFrom = makeAvatarBalanceEntityId(
      event.params.from,
      tokenId
    );
    const [
      avatar,
      tokenOrNull,
      avatarBalanceToOrNull,
      avatarBalanceFromOrNull,
      transaction,
    ] = await Promise.all([
      context.Avatar.get(event.params.to),
      context.Token.get(tokenId),
      context.AvatarBalance.get(avatarBalanceIdTo),
      context.AvatarBalance.get(avatarBalanceIdFrom),
      context.Transaction.get(event.transaction.hash),
    ]);
    const token = tokenOrNull ?? { id: tokenId };
    const avatarBalanceTo = avatarBalanceToOrNull ?? {
      avatar_id: event.params.to,
      token_id: tokenId,
    };

    const avatarBalanceFrom = avatarBalanceFromOrNull ?? {
      avatar_id: event.params.from,
      token_id: tokenId,
    };
    return {
      avatar,
      token,
      avatarsBalance: [{ to: avatarBalanceTo, from: avatarBalanceFrom }],
      transaction,
    };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { avatar, token, avatarsBalance, transaction } = loaderReturn;
    handleTransfer({
      event,
      context,
      hasTransaction: transaction !== undefined,
      avatarsBalance,
      tokens: [token],
      values: [event.params.value],
      transferType: "Erc20WrapperTransfer",
      avatarType: avatar?.avatarType ?? "Unknown",
      version: 2,
    });
  },
});

async function updateDemurragedAvatarBalance(
  event: eventLog<
    | WrappedERC20_DepositDemurraged_eventArgs
    | WrappedERC20_WithdrawDemurraged_eventArgs
  >,
  context: handlerContext,
  operation: "deposit" | "withdraw"
) {
  const avatarId = event.params.account;
  const tokenId = event.srcAddress;
  const balanceId = makeAvatarBalanceEntityId(avatarId, tokenId);
  const avatarBalance = await context.AvatarBalance.get(balanceId);

  if (avatarBalance) {
    const computedValueChange =
      operation === "deposit"
        ? -event.params.amount + event.params.inflationaryAmount
        : event.params.amount - event.params.inflationaryAmount;
    context.AvatarBalance.set({
      ...avatarBalance,
      computedValue: avatarBalance.computedValue! + computedValueChange,
    });
  }
}

WrappedERC20.DepositDemurraged.handler(async ({ event, context }) => {
  await updateDemurragedAvatarBalance(event, context, "deposit");
});

WrappedERC20.WithdrawDemurraged.handler(async ({ event, context }) => {
  await updateDemurragedAvatarBalance(event, context, "withdraw");
});

/**
 * On inflationary tokens, the `amount` on transfers is the inflationary value so we adjust to
 * always keep the `balance` property as demurraged amount even if the token is inflationary.
 * Amount is added in `updateAvatarBalance` then subtracted here because it might be a simple transfer.
 */
async function updateInflationaryAvatarBalance(
  event: eventLog<
    | WrappedERC20_DepositInflationary_eventArgs
    | WrappedERC20_WithdrawInflationary_eventArgs
  >,
  context: handlerContext,
  operation: "deposit" | "withdraw"
) {
  const avatarId = event.params.account;
  const tokenId = event.srcAddress;
  const balanceId = makeAvatarBalanceEntityId(avatarId, tokenId);
  const avatarBalance = await context.AvatarBalance.get(balanceId);

  if (avatarBalance) {
    const computedValueChange =
      operation === "deposit"
        ? -event.params.amount + event.params.demurragedAmount
        : event.params.amount - event.params.demurragedAmount;
    context.AvatarBalance.set({
      ...avatarBalance,
      computedValue: avatarBalance.computedValue! + computedValueChange,
    });
  }
}

WrappedERC20.DepositInflationary.handler(async ({ event, context }) => {
  await updateInflationaryAvatarBalance(event, context, "deposit");
});

WrappedERC20.WithdrawInflationary.handler(async ({ event, context }) => {
  await updateInflationaryAvatarBalance(event, context, "withdraw");
});
