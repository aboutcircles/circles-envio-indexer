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
  Token,
  StandardTreasury,
  NameRegistry,
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

ERC20Lift.ERC20WrapperDeployed.contractRegister(async ({ event, context }) => {
  context.addWrapperERC20Personal(event.params.erc20Wrapper);
});

ERC20Lift.ERC20WrapperDeployed.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.avatar);
  if (avatar) {
    context.Avatar.set({
      ...avatar,
      wrappedTokenId: event.params.erc20Wrapper,
    });
  }
  context.Token.set({
    id: event.params.erc20Wrapper,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.logIndex,
    transactionHash: event.transaction.hash,
    version: 2,
    tokenType:
      event.params.circlesType === 0n
        ? "WrappedDemurrageToken"
        : "WrappedStaticToken",
    tokenOwner: event.params.avatar,
  });
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
    lastMint: 0n,
  };

  context.Avatar.set(avatarEntity);
  await incrementStats(context, "signups");
});

Hub.Signup.handler(async ({ event, context }) => {
  const balanceId = makeAvatarBalanceEntityId(
    event.params.user,
    event.params.token
  );
  const avatarBalance = await context.AvatarBalance.get(balanceId);

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
    balance: avatarBalance?.balance || 0n,
    lastMint: 0n,
  };

  context.Avatar.set(avatarEntity);

  const tokenEntity: Token = {
    id: event.params.token,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.logIndex,
    transactionHash: event.transaction.hash,
    version: 1,
    tokenType: "Signup",
    tokenOwner: event.params.user,
  };

  context.Token.set(tokenEntity);

  await incrementStats(context, "signups");
});

HubV2.RegisterHuman.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.avatar);
  if (avatar) {
    context.Avatar.set({
      ...avatar,
      avatarType: "RegisterHuman",
      version: 2,
      tokenId: bytesToBigInt(toBytes(event.params.avatar)).toString(),
    });
  } else {
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
      lastMint: 0n,
    };

    context.Avatar.set(avatarEntity);
    await incrementStats(context, "signups");
  }
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
    lastMint: 0n,
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
    lastMint: 0n,
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
    lastMint: 0n,
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
  const avatar = await context.Avatar.get(event.params.human);
  if (avatar) {
    context.Avatar.set({
      ...avatar,
      lastMint: event.params.endPeriod,
    });
  }
});

StandardTreasury.CreateVault.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

StandardTreasury.GroupMintSingle.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.group);
  if (avatar) {
    const balanceId = makeAvatarBalanceEntityId(
      event.params.group,
      event.params.id.toString()
    );
    const avatarBalance = await context.AvatarBalance.get(balanceId);
    if (avatarBalance) {
      context.AvatarBalance.set({
        ...avatarBalance,
        balance: avatarBalance.balance + event.params.value,
      });
    } else {
      context.AvatarBalance.set({
        id: makeAvatarBalanceEntityId(
          event.params.group,
          event.params.id.toString()
        ),
        token_id: event.params.id.toString(),
        avatar_id: event.params.group,
        balance: event.params.value,
        inflationaryValue: 0n,
        isWrapped: false,
        lastCalculated: 0,
        version: 2,
      });
    }
  }
});

StandardTreasury.GroupMintBatch.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

StandardTreasury.GroupRedeem.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

StandardTreasury.GroupRedeemCollateralBurn.handler(
  async ({ event, context }) => {
    // TODO: Implement handler here
  }
);

StandardTreasury.GroupRedeemCollateralReturn.handler(
  async ({ event, context }) => {
    // TODO: Implement handler here
  }
);

// TODO: missing envent to redeeem from group

NameRegistry.UpdateMetadataDigest.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.avatar);
  if (avatar) {
    context.Avatar.set({
      ...avatar,
      cidV0Digest: event.params.metadataDigest,
    });
  }
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
  isWrapped: boolean,
  inflationaryValue: bigint | undefined,
  lastCalculated: number | undefined
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
    let updated = {
      ...avatarBalance,
      balance: avatarBalance.balance + amount,
    };
    if (inflationaryValue !== undefined) {
      updated.inflationaryValue =
        (avatarBalance.inflationaryValue || 0n) + inflationaryValue;
    }
    context.AvatarBalance.set(updated);
  } else {
    context.AvatarBalance.set({
      id: balanceId,
      avatar_id: avatarId,
      token_id: tokenId,
      balance: amount,
      version,
      isWrapped,
      inflationaryValue,
      lastCalculated,
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
    const token = await context.Token.get(tokens[i]);
    if (!token) {
      context.Token.set({
        id: tokens[i],
        blockNumber: event.block.number,
        timestamp: event.block.timestamp,
        transactionIndex: event.transaction.transactionIndex,
        logIndex: event.logIndex,
        transactionHash: event.transaction.hash,
        version,
        // TODO: fix
        tokenType: "RegisterHuman",
        // TODO: fix
        tokenOwner: event.params.to,
      });
    }

    const transferEntity: Transfer = {
      id: `${event.transaction.hash}-${event.logIndex}`,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionIndex: event.transaction.transactionIndex,
      transactionHash: event.transaction.hash,
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

    await updateAvatarBalance(
      context,
      event.params.to,
      tokens[i],
      values[i],
      version,
      isWrapped,
      undefined,
      undefined
    );
    await updateAvatarBalance(
      context,
      event.params.from,
      tokens[i],
      -values[i],
      version,
      isWrapped,
      undefined,
      undefined
    );
    await incrementStats(context, "transfers");
  }
};

PersonalCRC.Transfer.handler(
  async ({ event, context }) =>
    await handleTransfer({
      event,
      context,
      operator: undefined,
      values: [event.params.amount],
      tokens: [event.srcAddress],
      transferType: "Transfer",
      version: 1,
    })
);

Hub.HubTransfer.handler(
  async ({ event, context }) =>
    await handleTransfer({
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

HubV2.TransferSingle.handler(
  async ({ event, context }) =>
    await handleTransfer({
      event,
      context,
      operator: event.params.operator,
      values: [event.params.value],
      tokens: [event.params.id.toString()],
      transferType: "TransferSingle",
      version: 2,
    })
);

HubV2.TransferBatch.handler(
  async ({ event, context }) =>
    await handleTransfer({
      event,
      context,
      operator: event.params.operator,
      values: event.params.values,
      tokens: event.params.ids.map((id) => id.toString()),
      transferType: "TransferSingle",
      version: 2,
    })
);

WrapperERC20Personal.Transfer.handler(
  async ({ event, context }) =>
    await handleTransfer({
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
  await updateAvatarBalance(
    context,
    event.params.account,
    event.srcAddress,
    0n,
    2,
    true,
    event.params.inflationaryAmount,
    event.block.timestamp
  );
});

WrapperERC20Personal.WithdrawDemurraged.handler(async ({ event, context }) => {
  await updateAvatarBalance(
    context,
    event.params.account,
    event.srcAddress,
    0n,
    2,
    true,
    -event.params.inflationaryAmount,
    event.block.timestamp
  );
});

WrapperERC20Personal.DepositInflationary.handler(async ({ event, context }) => {
  await updateAvatarBalance(
    context,
    event.params.account,
    event.srcAddress,
    0n,
    2,
    true,
    event.params.demurragedAmount,
    event.block.timestamp
  );
});

WrapperERC20Personal.WithdrawInflationary.handler(
  async ({ event, context }) => {
    await updateAvatarBalance(
      context,
      event.params.account,
      event.srcAddress,
      0n,
      2,
      true,
      -event.params.demurragedAmount,
      event.block.timestamp
    );
  }
);

// ###############
// #### TRUST ####
// ###############

Hub.Trust.handler(async ({ event, context }) => {
  const trustId = `${event.params.user}${event.params.canSendTo}`;
  const oppositeTrustId = `${event.params.canSendTo}${event.params.user}`;
  const oppositeTrustRelation = await context.TrustRelation.get(
    oppositeTrustId
  );
  if (event.params.limit === 0n) {
    // this is untrust
    const trustRelation = await context.TrustRelation.get(trustId);
    if (trustRelation) {
      context.TrustRelation.set({
        ...trustRelation,
        expiryTime: 0n,
        limit: 0n,
      });
    }
    if (oppositeTrustRelation) {
      context.TrustRelation.set({
        ...oppositeTrustRelation,
        isMutual: false,
      });
    }
    return;
  }
  const isMutual = oppositeTrustRelation !== undefined;
  if (isMutual) {
    context.TrustRelation.set({
      ...oppositeTrustRelation,
      isMutual: true,
    });
  }
  const entity: TrustRelation = {
    id: trustId,
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
  const trustId = `${event.params.truster}${event.params.trustee}`;
  const oppositeTrustId = `${event.params.trustee}${event.params.truster}`;
  const oppositeTrustRelation = await context.TrustRelation.get(
    oppositeTrustId
  );
  const timeDifference =
    event.params.expiryTime - BigInt(event.block.timestamp);
  if (timeDifference < 3600n) {
    // this is untrust
    const trustRelation = await context.TrustRelation.get(trustId);
    if (trustRelation) {
      context.TrustRelation.set({
        ...trustRelation,
        expiryTime: 0n,
        limit: 0n,
      });
    }
    if (oppositeTrustRelation) {
      context.TrustRelation.set({
        ...oppositeTrustRelation,
        isMutual: false,
      });
    }
    return;
  }
  const isMutual = oppositeTrustRelation !== undefined;
  if (isMutual) {
    context.TrustRelation.set({
      ...oppositeTrustRelation,
      isMutual: true,
    });
  }
  const entity: TrustRelation = {
    id: trustId,
    blockNumber: event.block.number,
    timestamp: event.block.timestamp,
    transactionIndex: event.transaction.transactionIndex,
    logIndex: event.logIndex,
    version: 2,
    trustee: event.params.trustee,
    truster: event.params.truster,
    expiryTime: event.params.expiryTime,
    limit: parseEther("100"),
    isMutual,
  };

  context.TrustRelation.set(entity);
  await incrementStats(context, "trusts");
});
