import {
  ERC20Lift,
  HubV2,
  TrustRelation,
  NameRegistry,
  SafeAccount,
  Avatar,
} from "generated";
import { toBytes, bytesToBigInt, parseEther, zeroAddress } from "viem";
import { incrementStats } from "../incrementStats";
import { defaultAvatarProps, makeAvatarBalanceEntityId } from "../utils";
import { Profile } from "../types";
import { handleTransfer } from "../common/handleTransfer";
import { getProfileMetadataFromIpfs } from "../ipfs";
import { METRI_FEE_SAFE_ADDRESS } from "../constants";

// ###############
// #### TOKEN ####
// ###############

ERC20Lift.ERC20WrapperDeployed.contractRegister(
  async ({ event, context }) => {
    context.addWrappedERC20(event.params.erc20Wrapper);
  },
  { preRegisterDynamicContracts: true }
);

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
    tokenOwner_id: event.params.avatar,
    totalSupply: 0n,
  });
});

// ###############
// #### AVATAR ###
// ###############

HubV2.RegisterHuman.handlerWithLoader({
  loader: async ({ event, context }) => {
    const avatar = await context.Avatar.get(event.params.avatar);
    return { avatar };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { avatar } = loaderReturn;
    if (avatar) {
      // when migrating from v1
      context.Avatar.set({
        ...avatar,
        avatarType: "RegisterHuman",
        version: 2,
        token_id: bytesToBigInt(toBytes(event.params.avatar)).toString(),
        trustsGivenCount: 0,
        trustsReceivedCount: 0,
        invitedBy: event.params.inviter,
        migrated: true,
        acceptedInvite: event.block.timestamp,
      });
    } else {
      context.Avatar.set({
        ...defaultAvatarProps(event),
        version: 2,
        id: event.params.avatar,
        avatarType: "RegisterHuman",
        token_id: bytesToBigInt(toBytes(event.params.avatar)).toString(),
        profile_id: event.params.avatar,
        invitedBy: event.params.inviter,
        acceptedInvite: event.block.timestamp,
      });
      await incrementStats(context, "signups");
    }
  },
});

HubV2.RegisterHuman.contractRegister(
  async ({ event, context }) => {
    context.addSafeAccount(event.params.avatar);
  },
  { preRegisterDynamicContracts: true }
);

SafeAccount.ExecutionSuccess.handlerWithLoader({
  loader: async ({ event, context }) => {
    const transaction = await context.Transaction.get(event.transaction.hash);

    return { transaction };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { transaction } = loaderReturn;

    if (transaction) {
      context.Transaction.set({
        ...transaction,
        safeTxHash: event.params.txHash,
      });
    }
  },
});

HubV2.RegisterOrganization.handler(async ({ event, context }) => {
  context.Avatar.set({
    ...defaultAvatarProps(event),
    version: 2,
    id: event.params.organization,
    avatarType: "RegisterOrganization",
    token_id: bytesToBigInt(toBytes(event.params.organization)).toString(),
    profile_id: event.params.organization,
  });

  context.Profile.set({
    id: event.params.organization,
    description: undefined,
    previewImageUrl: undefined,
    imageUrl: undefined,
    name: event.params.name,
    symbol: undefined,
  });
  await incrementStats(context, "signups");
});

HubV2.RegisterGroup.handler(async ({ event, context }) => {
  const avatar = await context.Avatar.get(event.params.group);

  if (!avatar) {
    context.Avatar.set({
      ...defaultAvatarProps(event),
      version: 2,
      id: event.params.group,
      avatarType: "RegisterGroup",
      token_id: bytesToBigInt(toBytes(event.params.group)).toString(),
      profile_id: event.params.group,
    });
  } else {
    context.Avatar.set({
      ...avatar,
      version: 2,
      avatarType: "RegisterGroup",
      token_id: bytesToBigInt(toBytes(event.params.group)).toString(),
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionHash: event.transaction.hash,
      transactionIndex: event.transaction.transactionIndex,
    });
  }

  const profile = (await context.Profile.get(event.params.group)) || {
    id: event.params.group,
    name: undefined,
    description: undefined,
    previewImageUrl: undefined,
    imageUrl: undefined,
  };

  context.Profile.set({
    ...profile,
    name: event.params.name,
    symbol: event.params.symbol,
  });

  await incrementStats(context, "signups");
});

HubV2.PersonalMint.handlerWithLoader({
  loader: async ({ event, context }) => {
    const [avatar, transfers] = await Promise.all([
      context.Avatar.get(event.params.human),
      context.Transfer.getWhere.transactionHash.eq(event.transaction.hash),
    ]);

    return {
      avatar,
      transfers,
    };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { avatar, transfers } = loaderReturn;
    if (avatar) {
      context.Avatar.set({
        ...avatar,
        lastMint: event.block.timestamp,
      });
    }
    transfers
      .filter((t) => t.from === zeroAddress)
      .forEach((transfer) => {
        context.Transfer.set({
          ...transfer,
          transferType: "PersonalMint",
        });
      });
  },
});

NameRegistry.UpdateMetadataDigest.handler(async ({ event, context }) => {
  let profileMetadata: { cidV0: string | null; data: Profile | null } | null =
    null;
  try {
    profileMetadata = await getProfileMetadataFromIpfs(
      event.params.metadataDigest
    );
  } catch (_) {}

  const avatar = await context.Avatar.get(event.params.avatar);

  if (!avatar) {
    // register group emits metadata event update before the register group event
    context.Avatar.set({
      ...defaultAvatarProps(event),
      version: 2,
      id: event.params.avatar,
      avatarType: "Unknown",
      token_id: bytesToBigInt(toBytes(event.params.avatar)).toString(),
      cidV0: profileMetadata?.cidV0 ?? undefined,
      profile_id: event.params.avatar,
    });
  } else {
    let transitiveType: Avatar["avatarType"] = avatar.avatarType;
    if (avatar.version === 1) {
      transitiveType = "Migrating";
    }
    context.Avatar.set({
      ...avatar,
      avatarType: transitiveType,
      cidV0: profileMetadata?.cidV0 ?? undefined,
    });
  }

  const currentProfile = (await context.Profile.get(event.params.avatar)) || {
    id: event.params.avatar,
    name: undefined,
    symbol: undefined,
    description: undefined,
    previewImageUrl: undefined,
    imageUrl: undefined,
  };
  context.Profile.set({
    ...currentProfile,
    ...profileMetadata?.data,
  });
});

// ###############
// ## TRANSFERS ##
// ###############

HubV2.StreamCompleted.handlerWithLoader({
  loader: async ({ event, context }) => {
    let transfers = await context.Transfer.getWhere.transactionHash.eq(
      event.transaction.hash
    );

    return { transfers };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { transfers } = loaderReturn;

    for (let i = 0; i < transfers.length; i++) {
      if (
        transfers[i].transferType !== "TransferSingle" &&
        transfers[i].transferType !== "TransferBatch"
      ) {
        continue;
      }
      context.Transfer.set({
        ...transfers[i],
        isPartOfStreamOrHub: true,
      });
    }

    const transferId = `${event.transaction.hash}-stream`;
    if (event.params.to !== zeroAddress) {
      const transactionTransferToId = `${event.transaction.hash}-${event.logIndex}-${event.params.to}`;
      context.TransactionTransfer.set({
        id: transactionTransferToId,
        avatar_id: event.params.to,
        transaction_id: event.transaction.hash,
        transfer_id: transferId,
      });
    }
    if (event.params.from !== zeroAddress) {
      const transactionTransferFromId = `${event.transaction.hash}-${event.logIndex}-${event.params.from}`;
      context.TransactionTransfer.set({
        id: transactionTransferFromId,
        avatar_id: event.params.from,
        transaction_id: event.transaction.hash,
        transfer_id: transferId,
      });
    }
    context.Transfer.set({
      id: transferId,
      transactionHash: event.transaction.hash,
      logIndex: event.logIndex,
      from: event.params.from,
      to: event.params.to,
      operator: undefined,
      value: event.params.amounts.reduce((a, b) => a + b, 0n),
      // TODO: fix - this isn't always true, since it can be multiple tokens
      // eg. 0xe185f8e1f4b99383d5c801c7796b15de62e7df220087868440e6f59be5ce3909
      token: event.params.ids[0].toString(),
      transferType: "StreamCompleted",
      version: 2,
      isPartOfStreamOrHub: false,
    });
  },
});

HubV2.TransferSingle.handlerWithLoader({
  loader: async ({ event, context }) => {
    const avatar = await context.Avatar.get(event.params.to);

    return { avatar };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { avatar } = loaderReturn;

    await handleTransfer({
      event,
      context,
      operator: event.params.operator,
      values: [event.params.value],
      tokens: [event.params.id.toString()],
      transferType:
        event.params.to === METRI_FEE_SAFE_ADDRESS
          ? "MetriFee"
          : "TransferSingle",
      avatarType: avatar?.avatarType ?? "Unknown",
      version: 2,
    });
  },
});

HubV2.TransferBatch.handler(
  async ({ event, context }) =>
    await handleTransfer({
      event,
      context,
      operator: event.params.operator,
      values: event.params.values,
      tokens: event.params.ids.map((id) => id.toString()),
      transferType: "TransferSingle",
      avatarType: "Unknown",
      version: 2,
    })
);

HubV2.DiscountCost.handlerWithLoader({
  loader: async ({ event, context }) => {
    const avatarBalanceId = makeAvatarBalanceEntityId(
      event.params.account,
      event.params.id.toString()
    );
    const avatarBalance = await context.AvatarBalance.get(avatarBalanceId);
    const transfers = await context.Transfer.getWhere.transactionHash.eq(
      event.transaction.hash
    );

    return {
      avatarBalance,
      demurrageTransfer: transfers
        .sort((a, b) => a.logIndex - b.logIndex)
        .filter((t) => t.to === zeroAddress && t.from === event.params.account)
        .at(-1),
    };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { avatarBalance, demurrageTransfer } = loaderReturn;
    if (demurrageTransfer) {
      context.Transfer.set({
        ...demurrageTransfer,
        transferType: "Demurrage",
      });
    }
    if (avatarBalance) {
      context.AvatarBalance.set({
        ...avatarBalance,
        lastCalculated: event.block.timestamp,
      });
    }
  },
});

// ###############
// #### TRUST ####
// ###############

HubV2.Trust.handlerWithLoader({
  loader: async ({ event, context }) => {
    const trustId =
      `${event.params.truster}${event.params.trustee}2`.toLowerCase();
    const trustIdV1 =
      `${event.params.truster}${event.params.trustee}1`.toLowerCase();
    const oppositeTrustId =
      `${event.params.trustee}${event.params.truster}2`.toLowerCase();

    const [
      oppositeTrustRelation,
      avatarTrustee,
      avatarTruster,
      trustRelation,
      trustRelationV1,
    ] = await Promise.all([
      context.TrustRelation.get(oppositeTrustId),
      context.Avatar.get(event.params.trustee),
      context.Avatar.get(event.params.truster),
      context.TrustRelation.get(trustId),
      context.TrustRelation.get(trustIdV1),
    ]);

    return {
      avatarTrustee,
      avatarTruster,
      trustRelation,
      oppositeTrustRelation,
      trustId,
      trustRelationV1,
    };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const {
      avatarTrustee,
      avatarTruster,
      trustRelation,
      oppositeTrustRelation,
      trustId,
      trustRelationV1,
    } = loaderReturn;

    if (event.params.trustee === event.params.truster) {
      return;
    }

    const isUntrust = event.params.expiryTime < 2_000_000_000n;

    if (avatarTruster && avatarTruster.avatarType === "RegisterHuman") {
      if (!avatarTrustee) {
        context.Avatar.set({
          ...defaultAvatarProps(event),
          version: 2,
          id: event.params.trustee,
          avatarType: "Invite",
          profile_id: event.params.trustee,
          trustsReceivedCount: 1,
        });
      } else {
        const newTrustsReceivedCount = isUntrust
          ? avatarTrustee.trustsReceivedCount - 1
          : avatarTrustee.trustsReceivedCount + 1;
        context.Avatar.set({
          ...avatarTrustee,
          trustsReceivedCount: newTrustsReceivedCount,
          isVerified: newTrustsReceivedCount >= 3,
          avatarType:
            avatarTrustee.avatarType === "Unknown"
              ? "Invite"
              : avatarTrustee.avatarType,
        });
      }
    }

    if (avatarTruster && avatarTrustee && avatarTrustee.avatarType === "RegisterHuman") {
      const newTrustGivenCount = isUntrust
        ? avatarTruster.trustsGivenCount - 1
        : avatarTruster.trustsGivenCount + 1;

      context.Avatar.set({
        ...avatarTruster,
        trustsGivenCount: newTrustGivenCount,
      });
    }

    if (isUntrust) {
      // this is untrust
      if (trustRelation) {
        context.TrustRelation.set({
          ...trustRelation,
          expiryTime: 0n,
          limit: 0n,
          blockNumber: event.block.number,
          timestamp: event.block.timestamp,
          logIndex: event.logIndex,
          isMutual: false,
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
    const isMutual =
      oppositeTrustRelation !== undefined &&
      oppositeTrustRelation.expiryTime !== 0n;
    if (isMutual && !oppositeTrustRelation.isMutual) {
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
      trustee_id: event.params.trustee,
      truster_id: event.params.truster,
      expiryTime: event.params.expiryTime,
      limit: parseEther("100"),
      isMutual,
      isMigrated: false,
    };

    context.TrustRelation.set(entity);

    if (trustRelationV1 && !trustRelationV1.isMigrated) {
      context.TrustRelation.set({
        ...trustRelationV1,
        isMigrated: true,
      });
    }
    await incrementStats(context, "trusts");
  },
});
