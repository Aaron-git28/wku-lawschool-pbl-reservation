import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("reservation.create validation", () => {
  it("should validate input schema for time range", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Monday
    const mondayDate = "2026-02-16";

    // Test startTime < 8
    await expect(
      caller.reservation.create({
        roomId: 1,
        date: mondayDate,
        startTime: 7, // Invalid: before 8
        student1Name: "홍길동",
        student1Class: "1기",
        student2Name: "김철수",
        student2Class: "2기",
      })
    ).rejects.toThrow(); // Zod validation will throw

    // Test startTime > 23
    await expect(
      caller.reservation.create({
        roomId: 1,
        date: mondayDate,
        startTime: 24, // Invalid: after 23
        student1Name: "홍길동",
        student1Class: "1기",
        student2Name: "김철수",
        student2Class: "2기",
      })
    ).rejects.toThrow(); // Zod validation will throw
  });

  it("should validate required student information", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const mondayDate = "2026-02-16";

    // Test missing student1Name
    await expect(
      caller.reservation.create({
        roomId: 1,
        date: mondayDate,
        startTime: 10,
        student1Name: "", // Invalid: empty
        student1Class: "1기",
        student2Name: "김철수",
        student2Class: "2기",
      })
    ).rejects.toThrow(); // Zod validation will throw
  });
});

describe("studyRoom.list", () => {
  it("should return list of study rooms", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const rooms = await caller.studyRoom.list();

    expect(rooms).toBeDefined();
    expect(Array.isArray(rooms)).toBe(true);
    
    // Should initialize rooms if empty
    if (rooms.length > 0) {
      expect(rooms.length).toBe(6);
      const roomNumbers = rooms.map(r => r.roomNumber).sort();
      expect(roomNumbers).toEqual(["407", "408", "409", "523", "524", "525"]);
    }
  });
});
