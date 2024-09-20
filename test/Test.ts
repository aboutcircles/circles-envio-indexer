import assert from "assert";
import { TestHelpers, TransferV1, AvatarV1 } from "generated";
import { parseEther, zeroAddress } from "viem";
const { MockDb, Hub, Addresses } = TestHelpers;
const [token, token2, user1, user2] = Addresses.mockAddresses;

describe("Signup", () => {
  let mockDb: any;

  beforeEach(() => {
    mockDb = MockDb.createMockDb();
  });

  it("add new contract", async () => {
    const event = Hub.Signup.createMockEvent({
      token,
      user: user1,
    });
    mockDb = await Hub.Signup.processEvent({
      event,
      mockDb,
    });

    let actualHubSignUp = mockDb.entities.AvatarV1.get(user1);

    const expectedHubSignup: AvatarV1 = {
      id: user1,
      token,
      organization_id: undefined,
    };
    assert.deepEqual(
      actualHubSignUp,
      expectedHubSignup,
      "Actual HubHubTransfer should be the same as the expectedHubHubTransfer"
    );
  });
});

describe("Transfer", () => {
  let mockDb = MockDb.createMockDb();

  it("Signup and Transfer", async () => {
    // signup
    const eventUser1 = Hub.Signup.createMockEvent({
      token,
      user: user1,
    });
    mockDb = await Hub.Signup.processEvent({
      event: eventUser1,
      mockDb,
    });
    const eventUser2 = Hub.Signup.createMockEvent({
      token: token2,
      user: user2,
    });
    mockDb = await Hub.Signup.processEvent({
      event: eventUser2,
      mockDb,
    });
    // initial funds
    const eventFundUser1 = Hub.HubTransfer.createMockEvent({
      amount: parseEther("20"),
      from: zeroAddress,
      to: user1,
    });
    mockDb = await Hub.HubTransfer.processEvent({
      event: eventFundUser1,
      mockDb,
    });
    const eventFundUser2 = Hub.HubTransfer.createMockEvent({
      amount: parseEther("20"),
      from: zeroAddress,
      to: user2,
    });
    mockDb = await Hub.HubTransfer.processEvent({
      event: eventFundUser2,
      mockDb,
    });

    // actual test
    const eventTransfer = Hub.HubTransfer.createMockEvent({
      amount: parseEther("5"),
      from: user1,
      to: user2,
    });
    mockDb = await Hub.HubTransfer.processEvent({
      event: eventTransfer,
      mockDb,
    });

    let actualPersonalCRCUser1 = mockDb.entities.CirclesV1.get(user1);
    let actualPersonalCRCUser2 = mockDb.entities.CirclesV1.get(user2);
    let actualHubHubTransfer = mockDb.entities.TransferV1.get(
      `${eventTransfer.transaction.hash}`
    );

    const expectedPersonalCRCUser1 = {
      id: user1,
      balance: parseEther("15"),
    };
    const expectedPersonalCRCUser2 = {
      id: user2,
      balance: parseEther("25"),
    };
    const expectedHubHubTransfer: TransferV1 = {
      id: `${eventTransfer.transaction.hash}`,
      amount: parseEther("5"),
      from: user1,
      to: user2,
    };
    // Asserting that the entity in the mock database is the same as the expected entity
    assert.deepEqual(
      actualHubHubTransfer,
      expectedHubHubTransfer,
      "Actual HubHubTransfer should be the same as the expectedHubHubTransfer"
    );
    assert.deepEqual(
      actualPersonalCRCUser1,
      expectedPersonalCRCUser1,
      "Actual PersonalCRC1 should be the same as the expectedPersonalCRC1"
    );
    assert.deepEqual(
      actualPersonalCRCUser2,
      expectedPersonalCRCUser2,
      "Actual PersonalCRC2 should be the same as the expectedPersonalCRC2"
    );
  });
});
