import {
  Avatar,
  ERC20Lift,
  Group,
  handlerContext,
  HubV2,
  Organization,
  Trust,
  WrapperERC20Personal,
} from "generated";
import { incrementStats } from "./incrementStats";
import { zeroAddress } from "viem";

HubV2.RegisterHuman.handler(async ({ event, context }) => {
  const entity: Avatar = {
    id: event.params.avatar,
    inviter: undefined,
    stopped: false,
    lastMint: 0n,
    group_id: undefined,
    organization_id: undefined,
  };

  context.Avatar.set(entity);
  await incrementStats(context, "signups");
});

HubV2.InviteHuman.handler(async ({ event, context }) => {
  const entity: Avatar = {
    id: event.params.invited,
    inviter: event.params.inviter,
    stopped: false,
    lastMint: 0n,
    group_id: undefined,
    organization_id: undefined,
  };

  context.Avatar.set(entity);
  await incrementStats(context, "signups");
});

HubV2.RegisterOrganization.handler(async ({ event, context }) => {
  const orgEntity: Organization = {
    id: event.params.organization,
    name: event.params.name,
  };
  const avatarEntity: Avatar = {
    id: event.params.organization,
    inviter: undefined,
    stopped: false,
    lastMint: 0n,
    group_id: undefined,
    organization_id: event.params.organization,
  };

  context.Organization.set(orgEntity);
  context.Avatar.set(avatarEntity);
  await incrementStats(context, "signups");
});

HubV2.RegisterGroup.handler(async ({ event, context }) => {
  const groupEntity: Group = {
    id: event.params.group,
    mint: event.params.mint,
    treasury: event.params.treasury,
    name: event.params.name,
    symbol: event.params.symbol,
  };
  const avatarEntity: Avatar = {
    id: event.params.group,
    inviter: undefined,
    stopped: false,
    lastMint: 0n,
    group_id: event.params.group,
    organization_id: undefined,
  };

  context.Group.set(groupEntity);
  context.Avatar.set(avatarEntity);
  await incrementStats(context, "signups");
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

HubV2.Stopped.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.avatar);
  if (avatar) {
    context.Avatar.set({
      ...avatar,
      stopped: true,
    });
  }
});

HubV2.StreamCompleted.handler(async ({ event, context }) => {
  // TODO: Implement handler here
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

async function handleTransfer(
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
    handleTransfer(
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
      handleTransfer(
        context,
        event.params.ids[i],
        event.params.to,
        event.params.values[i]
      );
    }
  }
});

HubV2.URI.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

ERC20Lift.ProxyCreation.contractRegister(async ({ event, context }) => {
  context.addWrapperERC20Personal(event.params.proxy);
});

ERC20Lift.ERC20WrapperDeployed.handler(async ({ event, context }) => {
  // TODO: Implement handler here
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
