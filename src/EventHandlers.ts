import {
  eventLog,
  handlerContext,
  Hub,
  Hub_HubTransfer_eventArgs,
  PersonalCRC,
  PersonalCRC_Transfer_eventArgs,
  ERC20Lift,
  HubV2,
  WrapperERC20Personal,
  Avatar,
  TrustRelation,
  Transfer,
  HubV2_TransferSingle_eventArgs,
  HubV2_TransferBatch_eventArgs,
  WrapperERC20Personal_Transfer_eventArgs,
} from "generated";
import {
  toBytes,
  bytesToBigInt,
  zeroAddress,
  maxUint256,
  parseEther,
} from "viem";
import { incrementStats } from "./incrementStats";
import { TransferType_t } from "generated/src/db/Enums.gen";

function makeAvatarBalanceEntityId(avatarId: string, tokenId: string) {
  return `${avatarId}-${tokenId}`;
}

// ###############
// #### TOKEN ####
// ###############

Hub.Signup.contractRegister(async ({ event, context }) => {
  context.addPersonalCRC(event.params.token);
});

ERC20Lift.ProxyCreation.contractRegister(async ({ event, context }) => {
  context.addWrapperERC20Personal(event.params.proxy);
});

ERC20Lift.ERC20WrapperDeployed.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.avatar);
  if (avatar) {
    context.Avatar.set({
      ...avatar,
      wrappedTokenId: event.params.erc20Wrapper,
    });
  }
});

// ###############
// #### AVATAR ###
// ###############

Hub.OrganizationSignup.handler(async ({ event, context }) => {
  const avatarEntity: Avatar = {
    id: event.params.organization,
    avatarType: "OrganizationSignup",
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    invitedBy: undefined,
    version: 1,
    logIndex: event.logIndex,
    tokenId: undefined,
    cidV0Digest: undefined,
    name: undefined,
    transactionIndex: event.transaction.transactionIndex,
    wrappedTokenId: undefined,
    balance: 0n,
  };

  context.Avatar.set(avatarEntity);
  await incrementStats(context, "signups");
});

Hub.Signup.handler(async ({ event, context }) => {
  const avatarEntity: Avatar = {
    id: event.params.user,
    avatarType: "Signup",
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    invitedBy: undefined,
    version: 1,
    logIndex: event.logIndex,
    tokenId: event.params.token,
    cidV0Digest: undefined,
    name: undefined,
    transactionIndex: event.transaction.transactionIndex,
    wrappedTokenId: undefined,
    balance: 0n,
  };

  context.Avatar.set(avatarEntity);
  await incrementStats(context, "signups");
});

HubV2.RegisterHuman.handler(async ({ event, context }) => {
  const avatarEntity: Avatar = {
    id: event.params.avatar,
    avatarType: "RegisterHuman",
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    invitedBy: undefined,
    version: 2,
    logIndex: event.logIndex,
    tokenId: bytesToBigInt(toBytes(event.params.avatar)).toString(),
    cidV0Digest: undefined,
    name: undefined,
    transactionIndex: event.transaction.transactionIndex,
    wrappedTokenId: undefined,
    balance: 0n,
  };

  context.Avatar.set(avatarEntity);
  await incrementStats(context, "signups");
});

HubV2.InviteHuman.handler(async ({ event, context }) => {
  const avatarEntity: Avatar = {
    id: event.params.invited,
    avatarType: "InviteHuman",
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    invitedBy: event.params.inviter,
    version: 2,
    logIndex: event.logIndex,
    tokenId: bytesToBigInt(toBytes(event.params.invited)).toString(),
    cidV0Digest: undefined,
    name: undefined,
    transactionIndex: event.transaction.transactionIndex,
    wrappedTokenId: undefined,
    balance: 0n,
  };

  context.Avatar.set(avatarEntity);
  await incrementStats(context, "signups");
});

HubV2.RegisterOrganization.handler(async ({ event, context }) => {
  const avatarEntity: Avatar = {
    id: event.params.organization,
    avatarType: "RegisterOrganization",
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    invitedBy: undefined,
    version: 2,
    logIndex: event.logIndex,
    tokenId: bytesToBigInt(toBytes(event.params.organization)).toString(),
    cidV0Digest: undefined,
    name: event.params.name,
    transactionIndex: event.transaction.transactionIndex,
    wrappedTokenId: undefined,
    balance: 0n,
  };

  context.Avatar.set(avatarEntity);
  await incrementStats(context, "signups");
});

HubV2.RegisterGroup.handler(async ({ event, context }) => {
  const avatarEntity: Avatar = {
    id: event.params.group,
    avatarType: "RegisterGroup",
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionHash: event.transaction.hash,
    invitedBy: undefined,
    version: 2,
    logIndex: event.logIndex,
    tokenId: bytesToBigInt(toBytes(event.params.group)).toString(),
    cidV0Digest: undefined,
    name: event.params.name,
    transactionIndex: event.transaction.transactionIndex,
    wrappedTokenId: undefined,
    balance: 0n,
  };

  context.Avatar.set(avatarEntity);
  await incrementStats(context, "signups");
});

HubV2.Stopped.handler(async ({ event, context }) => {
  // const avatar = await context.Avatar.get(event.params.avatar);
  // if (avatar) {
  //   context.Avatar.set({
  //     ...avatar,
  //     stopped: true,
  //   });
  // }
});

HubV2.ApprovalForAll.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

HubV2.PersonalMint.handler(async ({ event, context }) => {
  // const avatar = await context.Avatar.get(event.params.human);
  // if (avatar) {
  //   context.Avatar.set({
  //     ...avatar,
  //     lastMint: event.params.endPeriod,
  //   });
  // }
});

HubV2.URI.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

// ###############
// ## TRANSFERS ##
// ###############

const updateAvatarBalance = async (
  context: handlerContext,
  avatarId: string,
  tokenId: string,
  amount: bigint,
  version: number,
  isWrapped: boolean
) => {
  if (avatarId === zeroAddress) {
    return;
  }
  const balanceId = makeAvatarBalanceEntityId(avatarId, tokenId);
  const [avatarBalance, avatar] = await Promise.all([
    context.AvatarBalance.get(balanceId),
    context.Avatar.get(avatarId),
  ]);
  if (avatarBalance) {
    context.AvatarBalance.set({
      ...avatarBalance,
      balance: avatarBalance.balance + amount,
    });
  } else {
    context.AvatarBalance.set({
      id: balanceId,
      avatar_id: avatarId,
      token_id: tokenId,
      balance: amount,
      version,
      isWrapped,
    });
  }

  if (avatar) {
    context.Avatar.set({
      ...avatar,
      balance: avatar.balance + amount,
    });
  }
};

const handleTransfer = async ({
  event,
  context,
  operator,
  values,
  tokens,
  transferType,
  version,
}: {
  event: eventLog<
    | Hub_HubTransfer_eventArgs
    | PersonalCRC_Transfer_eventArgs
    | HubV2_TransferSingle_eventArgs
    | HubV2_TransferBatch_eventArgs
    | WrapperERC20Personal_Transfer_eventArgs
  >;
  context: handlerContext;
  operator: string | undefined;
  values: bigint[];
  tokens: string[];
  transferType: TransferType_t;
  version: number;
}) => {
  let isWrapped = transferType === "Erc20WrapperTransfer";

  for (let i = 0; i < tokens.length; i++) {
    const transferEntity: Transfer = {
      id: event.transaction.hash,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionIndex: event.transaction.transactionIndex,
      logIndex: event.logIndex,
      from: event.params.from,
      to: event.params.to,
      operator,
      value: values[i],
      token: tokens[i],
      transferType,
      version,
    };
    context.Transfer.set(transferEntity);

    Promise.all([
      updateAvatarBalance(
        context,
        event.params.to,
        tokens[i],
        values[i],
        version,
        isWrapped
      ),
      updateAvatarBalance(
        context,
        event.params.from,
        tokens[i],
        -values[i],
        version,
        isWrapped
      ),
      incrementStats(context, "transfers"),
    ]);
  }
};

PersonalCRC.Transfer.handler(async ({ event, context }) =>
  handleTransfer({
    event,
    context,
    operator: undefined,
    values: [event.params.amount],
    tokens: [event.srcAddress],
    transferType: "Transfer",
    version: 1,
  })
);

Hub.HubTransfer.handler(async ({ event, context }) =>
  handleTransfer({
    event,
    context,
    operator: undefined,
    values: [event.params.amount],
    tokens: [event.srcAddress],
    transferType: "HubTransfer",
    version: 1,
  })
);

HubV2.StreamCompleted.handler(async ({ event, context }) => {
  // TODO: Implement handler here (waiting for pathfinder v2)
});

HubV2.TransferSingle.handler(async ({ event, context }) =>
  handleTransfer({
    event,
    context,
    operator: event.params.operator,
    values: [event.params.value],
    tokens: [event.params.id.toString()],
    transferType: "TransferSingle",
    version: 2,
  })
);

HubV2.TransferBatch.handler(async ({ event, context }) =>
  handleTransfer({
    event,
    context,
    operator: event.params.operator,
    values: event.params.values,
    tokens: event.params.ids.map((id) => id.toString()),
    transferType: "TransferSingle",
    version: 2,
  })
);

WrapperERC20Personal.Transfer.handler(async ({ event, context }) =>
  handleTransfer({
    event,
    context,
    operator: undefined,
    values: [event.params.value],
    tokens: [event.srcAddress],
    transferType: "Erc20WrapperTransfer",
    version: 2,
  })
);

WrapperERC20Personal.DepositDemurraged.handler(async ({ event, context }) => {
  updateAvatarBalance(
    context,
    event.params.account,
    event.srcAddress,
    event.params.amount,
    2,
    true
  );
});

WrapperERC20Personal.WithdrawDemurraged.handler(async ({ event, context }) => {
  updateAvatarBalance(
    context,
    event.params.account,
    event.srcAddress,
    -event.params.amount,
    2,
    true
  );
});

WrapperERC20Personal.DepositInflationary.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

WrapperERC20Personal.WithdrawInflationary.handler(
  async ({ event, context }) => {
    // TODO: Implement handler here
  }
);

// ###############
// #### TRUST ####
// ###############

Hub.Trust.handler(async ({ event, context }) => {
  const oppositeTrustRelation = await context.TrustRelation.get(
    `${event.params.canSendTo}${event.params.user}`
  );
  const isMutual = oppositeTrustRelation !== undefined;
  if (isMutual) {
    context.TrustRelation.set({
      ...oppositeTrustRelation,
      isMutual: true,
    });
  }
  const entity: TrustRelation = {
    id: `${event.params.user}${event.params.canSendTo}`,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.logIndex,
    version: 1,
    trustee: event.params.canSendTo,
    truster: event.params.user,
    expiryTime: maxUint256,
    limit: event.params.limit,
    isMutual,
  };

  context.TrustRelation.set(entity);
  await incrementStats(context, "trusts");
});

HubV2.Trust.handler(async ({ event, context }) => {
  const oppositeTrustRelation = await context.TrustRelation.get(
    `${event.params.trustee}${event.params.truster}`
  );
  const isMutual = oppositeTrustRelation !== undefined;
  if (isMutual) {
    context.TrustRelation.set({
      ...oppositeTrustRelation,
      isMutual: true,
    });
  }
  const entity: TrustRelation = {
    id: `${event.params.truster}${event.params.trustee}`,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.logIndex,
    version: 1,
    trustee: event.params.trustee,
    truster: event.params.truster,
    expiryTime: event.params.expiryTime,
    limit: parseEther("100"),
    isMutual,
  };

  context.TrustRelation.set(entity);
  await incrementStats(context, "trusts");
});
