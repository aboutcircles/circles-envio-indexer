import {
  eventLog,
  handlerContext,
  Hub,
  Hub_HubTransfer_eventArgs,
  // OrganizationV1,
  // AvatarV1,
  TransferV1,
  TrustV1,
  PersonalCRC,
  PersonalCRC_Transfer_eventArgs,
  // Avatar,
  ERC20Lift,
  // Group,
  HubV2,
  // Organization,
  Trust,
  WrapperERC20Personal,
  Avatars,
} from "generated";
import { toBytes, bytesToBigInt, zeroAddress } from "viem";
import { incrementStats } from "./incrementStats";

// ###############
// #### TOKEN ####
// ###############

Hub.Signup.contractRegister(async ({ event, context }) => {
  context.addPersonalCRC(event.params.token);
});

Hub.Signup.handler(async ({ event, context }) => {
  const avatar = await context.Avatars.get(event.params.user);
  if (avatar) {
    context.Avatars.set({
      ...avatar,
      tokenId: event.params.token,
    });
  }
});

ERC20Lift.ProxyCreation.contractRegister(async ({ event, context }) => {
  context.addWrapperERC20Personal(event.params.proxy);
});

ERC20Lift.ERC20WrapperDeployed.handler(async ({ event, context }) => {
  const avatar = await context.Avatars.get(event.params.avatar);
  if (avatar) {
    context.Avatars.set({
      ...avatar,
      wrappedTokenId: event.params.erc20Wrapper,
    });
  }
});

// ###############
// #### AVATAR ###
// ###############

Hub.OrganizationSignup.handler(async ({ event, context }) => {
  const avatarEntity: Avatars = {
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
    wrappedTokenId: undefined
  };

  context.Avatars.set(avatarEntity);
  await incrementStats(context, 'signups');
});

Hub.Signup.handler(async ({ event, context }) => {
  const avatarEntity: Avatars = {
    id: event.params.user,
    avatarType: "Signup",
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
    wrappedTokenId: undefined
  };

  context.Avatars.set(avatarEntity);
  await incrementStats(context, 'signups');
});

HubV2.RegisterHuman.handler(async ({ event, context }) => {
  const avatarEntity: Avatars = {
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
    wrappedTokenId: undefined
  };

  context.Avatars.set(avatarEntity);
  await incrementStats(context, "signups");
});

HubV2.InviteHuman.handler(async ({ event, context }) => {
  const avatarEntity: Avatars = {
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
    wrappedTokenId: undefined
  };

  context.Avatars.set(avatarEntity);
  await incrementStats(context, "signups");
});

HubV2.RegisterOrganization.handler(async ({ event, context }) => {
  const avatarEntity: Avatars = {
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
    wrappedTokenId: undefined
  };

  context.Avatars.set(avatarEntity);
  await incrementStats(context, "signups");
});

HubV2.RegisterGroup.handler(async ({ event, context }) => {
  const avatarEntity: Avatars = {
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
    wrappedTokenId: undefined
  };

  context.Avatars.set(avatarEntity);
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

const handleTransfer = async ({
  event,
  context,
}: {
  event: eventLog<Hub_HubTransfer_eventArgs | PersonalCRC_Transfer_eventArgs>;
  context: handlerContext;
}) => {
  const entity: TransferV1 = {
    id: event.transaction.hash,
    from: event.params.from,
    to: event.params.to,
    amount: event.params.amount,
  };

  context.TransferV1.set(entity);

  const personalCRC = await context.CirclesV1.get(event.params.to);
  let newBalance = event.params.amount;
  if (personalCRC) {
    newBalance += personalCRC.balance;
  }
  context.CirclesV1.set({
    id: event.params.to,
    balance: newBalance,
  });
  if (event.params.from !== zeroAddress) {
    const personalCRC = await context.CirclesV1.get(event.params.from);
    let newBalance = event.params.amount;
    if (personalCRC) {
      newBalance = personalCRC.balance - newBalance;
    }
    context.CirclesV1.set({
      id: event.params.from,
      balance: newBalance,
    });
  }
  await incrementStats(context, 'transfers');
};

PersonalCRC.Transfer.handler(handleTransfer);

Hub.HubTransfer.handler(handleTransfer);

HubV2.StreamCompleted.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

async function handleTransferV2(
  context: handlerContext,
  id: bigint,
  to: string,
  value: bigint
) {
  const circlesId = `${id}-${to}`;
  let circles = await context.Circles.get(circlesId);
  if (!circles) {
    circles = {
      id: circlesId,
      avatar_id: to,
      balance: value,
    };
  } else {
    circles = {
      ...circles,
      balance: circles.balance + value,
    };
  }
  context.Circles.set(circles);
}

HubV2.TransferSingle.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.to);
  if (avatar !== undefined) {
    handleTransferV2(
      context,
      event.params.id,
      event.params.to,
      event.params.value
    );
  }
});

HubV2.TransferBatch.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.to);
  if (avatar) {
    if (event.params.ids.length !== event.params.values.length) {
      throw new Error("ids and values must have the same length");
    }
    for (let i = 0; i < event.params.ids.length; i++) {
      handleTransferV2(
        context,
        event.params.ids[i],
        event.params.to,
        event.params.values[i]
      );
    }
  }
});

async function updateWrappedCirclesBalance(
  context: handlerContext,
  tokenAddress: string,
  userAddress: string,
  value: bigint
) {
  const circlesId = `${tokenAddress}-${userAddress}`;
  let circles = await context.WrappedCircles.get(circlesId);
  if (!circles) {
    circles = {
      id: circlesId,
      avatar_id: userAddress,
      balance: value,
    };
  }
  context.WrappedCircles.set({
    ...circles,
    balance: circles.balance + value,
  });
}

WrapperERC20Personal.Transfer.handler(async ({ event, context }) => {
  if (event.params.from !== zeroAddress) {
    await updateWrappedCirclesBalance(
      context,
      event.srcAddress,
      event.params.from,
      -event.params.value
    );
  }

  await updateWrappedCirclesBalance(
    context,
    event.srcAddress,
    event.params.to,
    event.params.value
  );
});

WrapperERC20Personal.DepositDemurraged.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

WrapperERC20Personal.WithdrawDemurraged.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

WrapperERC20Personal.DepositInflationary.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

WrapperERC20Personal.WithdrawInflationary.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

// ###############
// #### TRUST ####
// ###############

Hub.Trust.handler(async ({ event, context }) => {
  const entity: TrustV1 = {
    id: `${event.params.user}${event.params.canSendTo}`,
    limit: event.params.limit,
  };

  context.TrustV1.set(entity);
  await incrementStats(context, 'trusts');
});

HubV2.Trust.handler(async ({ event, context }) => {
  const entity: Trust = {
    id: `${event.params.truster}-${event.params.trustee}`,
    trustee_id: event.params.trustee,
    truster_id: event.params.truster,
    isMutual: false,
    expiry: event.params.expiryTime,
  };

  context.Trust.set(entity);
  await incrementStats(context, "trusts");
});
