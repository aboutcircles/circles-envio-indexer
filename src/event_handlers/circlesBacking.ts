import { CirclesBacking } from "generated";

CirclesBacking.CirclesBackingInitiated.handler(async ({ event, context }) => {
  context.CirclesBacking.set({
    id: event.params.circlesBackingInstance,
    // initiation details
    initiatedAt: event.block.timestamp,
    initiatedBlock: event.block.number,
    initiatedTx: event.transaction.hash,
    initiatedLogIndex: event.logIndex,
    // common data
    circlesBackingInstance: event.params.circlesBackingInstance,
    personalCirclesAddress: event.params.personalCirclesAddress,
    backer_id: event.params.backer,
    backingAsset: event.params.backingAsset,
    lbpAddress: undefined,
    // completion fields start as undefined
    completedAt: undefined,
    completedBlock: undefined,
    completedTx: undefined,
    completedLogIndex: undefined,
  });
});

CirclesBacking.CirclesBackingCompleted.handler(async ({ event, context }) => {
  const circlesBacking = await context.CirclesBacking.get(
    event.params.circlesBackingInstance
  );

  if (!circlesBacking) {
    return;
  }

  context.CirclesBacking.set({
    ...circlesBacking,
    // completion details
    completedAt: event.block.timestamp,
    completedBlock: event.block.number,
    completedTx: event.transaction.hash,
    completedLogIndex: event.logIndex,
    lbpAddress: event.params.lbp,
  });
});
