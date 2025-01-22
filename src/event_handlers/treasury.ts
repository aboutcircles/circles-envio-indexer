import {
  CustomTreasury,
  HandlerTypes_handler,
  HandlerTypes_loader,
  StandardTreasury,
  StandardTreasury_GroupMintBatch_eventArgs,
  StandardTreasury_GroupMintSingle_eventArgs,
  StandardTreasury_GroupRedeem_eventArgs,
  StandardTreasury_GroupRedeemCollateralBurn_eventArgs,
  StandardTreasury_GroupRedeemCollateralReturn_eventArgs,
} from "generated";
import { Transfer_t } from "generated/src/db/Entities.gen";
import { TransferType_t } from "generated/src/db/Enums.gen";

StandardTreasury.CreateVault.handler(async ({ event, context }) => {
  // TODO: Implement handler here
});

const loader: HandlerTypes_loader<
  | StandardTreasury_GroupMintSingle_eventArgs
  | StandardTreasury_GroupMintBatch_eventArgs
  | StandardTreasury_GroupRedeem_eventArgs
  | StandardTreasury_GroupRedeemCollateralReturn_eventArgs
  | StandardTreasury_GroupRedeemCollateralBurn_eventArgs,
  {
    transfers: Transfer_t[];
  }
> = async ({ event, context }) => {
  let transfers = await context.Transfer.getWhere.transactionHash.eq(
    event.transaction.hash
  );

  return { transfers };
};

const createHandler =
  (
    transferType: TransferType_t
  ): HandlerTypes_handler<
    | StandardTreasury_GroupMintSingle_eventArgs
    | StandardTreasury_GroupMintBatch_eventArgs
    | StandardTreasury_GroupRedeem_eventArgs
    | StandardTreasury_GroupRedeemCollateralReturn_eventArgs
    | StandardTreasury_GroupRedeemCollateralBurn_eventArgs,
    {
      transfers: Transfer_t[];
    }
  > =>
  async ({ context, loaderReturn }) => {
    const { transfers } = loaderReturn;

    for (let i = 0; i < transfers.length; i++) {
      context.Transfer.set({
        ...transfers[i],
        transferType,
      });
    }
  };

// #########################
// ### STANDARD TREASURY ###
// #########################

StandardTreasury.GroupMintSingle.handlerWithLoader({
  loader,
  handler: createHandler("GroupMintSingle"),
});

StandardTreasury.GroupMintBatch.handlerWithLoader({
  loader,
  handler: createHandler("GroupMintBatch"),
});

StandardTreasury.GroupRedeem.handlerWithLoader({
  loader,
  handler: createHandler("GroupRedeem"),
});

StandardTreasury.GroupRedeemCollateralBurn.handlerWithLoader({
  loader,
  handler: createHandler("GroupRedeemCollateralBurn"),
});

StandardTreasury.GroupRedeemCollateralReturn.handlerWithLoader({
  loader,
  handler: createHandler("GroupRedeemCollateralReturn"),
});

// #########################
// #### CUSTOM TREASURY ####
// #########################

CustomTreasury.GroupMintSingle.handlerWithLoader({
  loader,
  handler: createHandler("GroupMintSingle"),
});

CustomTreasury.GroupMintBatch.handlerWithLoader({
  loader,
  handler: createHandler("GroupMintBatch"),
});

CustomTreasury.GroupRedeem.handlerWithLoader({
  loader,
  handler: createHandler("GroupRedeem"),
});

CustomTreasury.GroupRedeemCollateralBurn.handlerWithLoader({
  loader,
  handler: createHandler("GroupRedeemCollateralBurn"),
});

CustomTreasury.GroupRedeemCollateralReturn.handlerWithLoader({
  loader,
  handler: createHandler("GroupRedeemCollateralReturn"),
});
