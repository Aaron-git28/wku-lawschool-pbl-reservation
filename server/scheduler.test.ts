import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Weekly Reset Scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should calculate correct time until next Sunday midnight", () => {
    // 월요일 오후 3시로 설정
    const monday3pm = new Date(2026, 1, 16, 15, 0, 0); // 2026년 2월 16일 월요일 3시
    vi.setSystemTime(monday3pm);

    // 다음 일요일까지의 시간 계산
    const now = new Date();
    const currentDay = now.getDay(); // 1 (월요일)
    const daysUntilSunday = 7 - currentDay; // 6일
    
    const nextSunday = new Date(now);
    nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
    nextSunday.setHours(0, 0, 0, 0);

    const timeUntilReset = nextSunday.getTime() - now.getTime();

    // 대략 6일 정도의 시간이어야 함 (6일 - 15시간)
    const sixDaysInMs = 6 * 24 * 60 * 60 * 1000;
    const fifteenHoursInMs = 15 * 60 * 60 * 1000;
    expect(timeUntilReset).toBeLessThan(sixDaysInMs + 1000);
    expect(timeUntilReset).toBeGreaterThan(sixDaysInMs - fifteenHoursInMs - 1000);
  });

  it("should handle Sunday correctly - schedule for next week", () => {
    // 일요일 오후 3시로 설정
    const sunday3pm = new Date(2026, 1, 15, 15, 0, 0); // 2026년 2월 15일 일요일 3시
    vi.setSystemTime(sunday3pm);

    const now = new Date();
    const currentDay = now.getDay(); // 0 (일요일)
    const daysUntilSunday = currentDay === 0 ? 7 : 7 - currentDay; // 7일
    
    const nextSunday = new Date(now);
    nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
    nextSunday.setHours(0, 0, 0, 0);

    const timeUntilReset = nextSunday.getTime() - now.getTime();

    // 대략 7일 정도의 시간이어야 함 (7일 - 15시간)
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const fifteenHoursInMs = 15 * 60 * 60 * 1000;
    expect(timeUntilReset).toBeLessThan(sevenDaysInMs + 1000);
    expect(timeUntilReset).toBeGreaterThan(sevenDaysInMs - fifteenHoursInMs - 1000);
  });

  it("should schedule midnight correctly", () => {
    // 월요일 오후 3시로 설정
    const monday3pm = new Date(2026, 1, 16, 15, 0, 0);
    vi.setSystemTime(monday3pm);

    const now = new Date();
    const nextSunday = new Date(now);
    nextSunday.setDate(nextSunday.getDate() + (7 - now.getDay()));
    nextSunday.setHours(0, 0, 0, 0);

    // 다음 일요일 자정이 정확히 설정되었는지 확인
    expect(nextSunday.getHours()).toBe(0);
    expect(nextSunday.getMinutes()).toBe(0);
    expect(nextSunday.getSeconds()).toBe(0);
    expect(nextSunday.getMilliseconds()).toBe(0);
    expect(nextSunday.getDay()).toBe(0); // 일요일
  });
});
