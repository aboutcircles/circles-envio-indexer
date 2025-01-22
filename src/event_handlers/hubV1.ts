import { Hub, PersonalCRC } from "generated";
import { maxUint256, zeroAddress } from "viem";
import { incrementStats } from "../incrementStats";
import { handleTransfer } from "../common/handleTransfer";
import { defaultAvatarProps, makeAvatarBalanceEntityId } from "../utils";
import { getProfileMetadataFromGardenApi } from "../gardenApi";
import { Transfer_t } from "generated/src/db/Entities.gen";

// ###############
// #### TOKEN ####
// ###############

Hub.Signup.contractRegister(
  async ({ event, context }) => {
    context.addPersonalCRC(event.params.token);
  },
  { preRegisterDynamicContracts: true }
);

// ###############
// #### AVATAR ###
// ###############

Hub.OrganizationSignup.handler(async ({ event, context }) => {
  context.Avatar.set({
    ...defaultAvatarProps(event),
    version: 1,
    id: event.params.organization,
    avatarType: "OrganizationSignup",
    profile_id: event.params.organization,
  });
  await incrementStats(context, "signups");
});

Hub.Signup.handlerWithLoader({
  loader: async ({ event, context }) => {
    const avatar = await context.Avatar.get(event.params.user);

    return { avatar };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { avatar } = loaderReturn;

    if (avatar && avatar.version !== 1) {
      return;
    }

    const profileFromGarden = await getProfileMetadataFromGardenApi(
      event.params.user
    );

    if (profileFromGarden && profileFromGarden.data) {
      const { data } = profileFromGarden;
      context.Profile.set({
        id: event.params.user,
        description: undefined,
        previewImageUrl: data?.previewImageUrl,
        imageUrl: undefined,
        name: data?.name,
        symbol: undefined,
      });
    }

    context.Avatar.set({
      ...defaultAvatarProps(event),
      version: 1,
      id: event.params.user,
      avatarType: "Signup",
      token_id: event.params.token,
      profile_id: event.params.user,
    });

    context.Token.set({
      id: event.params.token,
      blockNumber: event.block.number,
      timestamp: event.block.timestamp,
      transactionIndex: event.transaction.transactionIndex,
      logIndex: event.logIndex,
      transactionHash: event.transaction.hash,
      version: 1,
      tokenType: "Signup",
      tokenOwner_id: event.params.user,
      totalSupply: 0n,
    });

    await incrementStats(context, "signups");
  },
});

// ###############
// ## TRANSFERS ##
// ###############

PersonalCRC.Transfer.handler(
  async ({ event, context }) =>
    await handleTransfer({
      event,
      context,
      operator: undefined,
      values: [event.params.amount],
      tokens: [event.srcAddress],
      transferType: "Transfer",
      avatarType: "Signup",
      version: 1,
    })
);

Hub.HubTransfer.handlerWithLoader({
  loader: async ({ event, context }) => {
    const transfers = await context.Transfer.getWhere.transactionHash.eq(
      event.transaction.hash
    );

    return { transfers };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { transfers } = loaderReturn;

    for (let i = 0; i < transfers.length; i++) {
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
      value: event.params.amount,
      token: event.srcAddress,
      transferType: "HubTransfer",
      version: 1,
      isPartOfStreamOrHub: false,
    });
  },
});

// ###############
// #### TRUST ####
// ###############

Hub.Trust.handlerWithLoader({
  loader: async ({ event, context }) => {
    const trustId =
      `${event.params.user}${event.params.canSendTo}1`.toLowerCase();
    const oppositeTrustId =
      `${event.params.canSendTo}${event.params.user}1`.toLowerCase();

    const [trustRelation, oppositeTrustRelation] = await Promise.all([
      context.TrustRelation.get(trustId),
      context.TrustRelation.get(oppositeTrustId),
    ]);

    return {
      trustId,
      trustRelation,
      oppositeTrustRelation,
    };
  },
  handler: async ({ event, context, loaderReturn }) => {
    const { trustId, trustRelation, oppositeTrustRelation } = loaderReturn;

    if (event.params.user === event.params.canSendTo) {
      return;
    }

    if (event.params.limit === 0n) {
      // this is untrust
      if (trustRelation && trustRelation.version === 1) {
        context.TrustRelation.set({
          ...trustRelation,
          expiryTime: 0n,
          limit: 0n,
        });
      }
      if (oppositeTrustRelation && oppositeTrustRelation.version === 1) {
        context.TrustRelation.set({
          ...oppositeTrustRelation,
          isMutual: false,
        });
      }
      return;
    }
    // TODO: update trustsReceivedCount and trustsGivenCount
    const isMutual = oppositeTrustRelation !== undefined;
    if (isMutual && oppositeTrustRelation.version === 1) {
      context.TrustRelation.set({
        ...oppositeTrustRelation,
        isMutual: true,
      });
    }
    if (!trustRelation) {
      context.TrustRelation.set({
        id: trustId,
        blockNumber: event.block.number,
        timestamp: event.block.timestamp,
        transactionIndex: event.transaction.transactionIndex,
        logIndex: event.logIndex,
        version: 1,
        trustee_id: event.params.user,
        truster_id: event.params.canSendTo,
        expiryTime: maxUint256,
        limit: event.params.limit,
        isMutual,
        isMigrated: false,
      });
      await incrementStats(context, "trusts");
    }
  },
});
