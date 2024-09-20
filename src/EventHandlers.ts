import {
  eventLog,
  handlerContext,
  Hub,
  Hub_HubTransfer_eventArgs,
  OrganizationV1,
  AvatarV1,
  TransferV1,
  TrustV1,
  PersonalCRC,
  PersonalCRC_Transfer_eventArgs,
} from "generated";
import { zeroAddress } from "viem";
import { incrementStats } from "./incrementStats";

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

Hub.OrganizationSignup.handler(async ({ event, context }) => {
  const orgEntity: OrganizationV1 = {
    id: event.params.organization,
  };

  const entity: AvatarV1 = {
    id: `${event.params.organization}`,
    token: undefined,
    organization_id: orgEntity.id
  };

  context.AvatarV1.set(entity);
  context.OrganizationV1.set(orgEntity);
  await incrementStats(context, 'signups');
});

Hub.Signup.contractRegister(async ({ event, context }) => {
  context.addPersonalCRC(event.params.token);
});

Hub.Signup.handler(async ({ event, context }) => {
  const entity: AvatarV1 = {
    id: event.params.user,
    token: event.params.token,
    organization_id: undefined
  };

  context.AvatarV1.set(entity);
  await incrementStats(context, 'signups');
});

Hub.Trust.handler(async ({ event, context }) => {
  const entity: TrustV1 = {
    id: `${event.params.user}${event.params.canSendTo}`,
    limit: event.params.limit,
  };

  context.TrustV1.set(entity);
  await incrementStats(context, 'trusts');
});
