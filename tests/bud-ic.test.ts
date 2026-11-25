import { test } from "node:test";
import assert from "node:assert/strict";
import { MemoryAdapter } from "../src/integrations/service/storage.ts";
import { BudService } from "../src/bud/budService.ts";

const WS = "meridian-ventures";

function svc(): BudService {
  return new BudService(new MemoryAdapter(), WS);
}

function txInput(overrides: Partial<Parameters<BudService["createICTransaction"]>[0]> = {}) {
  return {
    fromEntityId: "GNV-RE",
    fromEntityName: "GNV Real Estate",
    toEntityId: "GNV-PROP",
    toEntityName: "GNV Properties",
    type: "Management Fee" as const,
    description: "Q1 management fee",
    amount: 500_000,
    date: "2026-05-01",
    fromAccountCode: "1310",
    fromAccountName: "IC Receivable",
    toAccountCode: "2310",
    toAccountName: "IC Payable",
    ...overrides,
  };
}

// ─── SVC-1: IC numbering ───────────────────────────────────────────────────────

test("SVC-1: first IC transaction gets IC-0001", async () => {
  const s = svc();
  const tx = await s.createICTransaction(txInput());
  assert.equal(tx.icNumber, "IC-0001");
});

test("SVC-1: sequential numbers don't collide after delete", async () => {
  const s = svc();
  const tx1 = await s.createICTransaction(txInput());
  const tx2 = await s.createICTransaction(txInput({ description: "Second" }));
  assert.equal(tx1.icNumber, "IC-0001");
  assert.equal(tx2.icNumber, "IC-0002");
  // Delete tx1; next should be IC-0003 (max-of-existing = 2)
  await s.deleteICTransaction(tx1.id);
  const tx3 = await s.createICTransaction(txInput({ description: "Third" }));
  assert.equal(tx3.icNumber, "IC-0003");
});

// ─── UI-1 / SVC-1: Amount validation ──────────────────────────────────────────

test("SVC-1: zero amount is rejected", async () => {
  const s = svc();
  await assert.rejects(
    () => s.createICTransaction(txInput({ amount: 0 })),
    /positive/i,
  );
});

test("SVC-1: negative amount is rejected", async () => {
  const s = svc();
  await assert.rejects(
    () => s.createICTransaction(txInput({ amount: -100 })),
    /positive/i,
  );
});

test("SVC-1: NaN amount is rejected", async () => {
  const s = svc();
  await assert.rejects(
    () => s.createICTransaction(txInput({ amount: NaN })),
    /positive/i,
  );
});

test("SVC-1: Infinity amount is rejected", async () => {
  const s = svc();
  await assert.rejects(
    () => s.createICTransaction(txInput({ amount: Infinity })),
    /positive/i,
  );
});

// ─── Elimination round-trip ────────────────────────────────────────────────────

test("eliminateTransaction: status becomes Eliminated and eliminationId is set", async () => {
  const s = svc();
  const tx = await s.createICTransaction(txInput());
  const elim = await s.eliminateTransaction(tx, 2026);
  const updated = (await s.listICTransactions()).find((t) => t.id === tx.id)!;
  assert.equal(updated.status, "Eliminated");
  assert.equal(updated.eliminationId, elim.id);
});

test("eliminateTransaction: produces two balanced entries (Dr = Cr)", async () => {
  const s = svc();
  const tx = await s.createICTransaction(txInput());
  const elim = await s.eliminateTransaction(tx, 2026);
  const totalDr = elim.entries.reduce((sum, e) => sum + e.debit, 0);
  const totalCr = elim.entries.reduce((sum, e) => sum + e.credit, 0);
  assert.equal(totalDr, totalCr, "Elimination entries must balance");
  assert.equal(totalDr, tx.amount);
});

test("eliminateTransaction: Dr entry is on toEntity (IC Payable), Cr on fromEntity (IC Receivable)", async () => {
  const s = svc();
  const tx = await s.createICTransaction(txInput());
  const elim = await s.eliminateTransaction(tx, 2026);
  const drEntry = elim.entries.find((e) => e.debit > 0)!;
  const crEntry = elim.entries.find((e) => e.credit > 0)!;
  assert.equal(drEntry.entityId, tx.toEntityId);
  assert.equal(crEntry.entityId, tx.fromEntityId);
});

// ─── Duplicate elimination prevention ─────────────────────────────────────────

test("eliminateTransaction: eliminating an already-Eliminated tx throws", async () => {
  const s = svc();
  const tx = await s.createICTransaction(txInput());
  await s.eliminateTransaction(tx, 2026);
  // Fetch the now-Eliminated version
  const eliminated = (await s.listICTransactions()).find((t) => t.id === tx.id)!;
  await assert.rejects(
    () => s.eliminateTransaction(eliminated, 2026),
    /already eliminated/i,
  );
  // Confirm only one elimination record exists
  const elims = await s.listEliminations();
  assert.equal(elims.filter((e) => e.icTransactionId === tx.id).length, 1);
});

// ─── Reversal ─────────────────────────────────────────────────────────────────

test("reverseElimination: status returns to Open and eliminationId is cleared", async () => {
  const s = svc();
  const tx = await s.createICTransaction(txInput());
  const elim = await s.eliminateTransaction(tx, 2026);
  await s.reverseElimination(elim.id);
  const reverted = (await s.listICTransactions()).find((t) => t.id === tx.id)!;
  assert.equal(reverted.status, "Open");
  assert.equal(reverted.eliminationId, undefined);
  // Elimination record is gone
  const elims = await s.listEliminations();
  assert.equal(elims.find((e) => e.id === elim.id), undefined);
});

// ─── deleteICTransaction cascade ──────────────────────────────────────────────

test("deleteICTransaction: cascades to linked elimination", async () => {
  const s = svc();
  const tx = await s.createICTransaction(txInput());
  const elim = await s.eliminateTransaction(tx, 2026);
  await s.deleteICTransaction(tx.id);
  const txns = await s.listICTransactions();
  assert.equal(txns.find((t) => t.id === tx.id), undefined);
  const elims = await s.listEliminations();
  assert.equal(elims.find((e) => e.id === elim.id), undefined);
});

// ─── workspaceId scoping ──────────────────────────────────────────────────────

test("listICTransactions: only returns records from same workspace", async () => {
  const adapter = new MemoryAdapter();
  const s1 = new BudService(adapter, "workspace-A");
  const s2 = new BudService(adapter, "workspace-B");
  await s1.createICTransaction(txInput());
  const txns2 = await s2.listICTransactions();
  assert.equal(txns2.length, 0, "workspace-B should see no transactions from workspace-A");
});
