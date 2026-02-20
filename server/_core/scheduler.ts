import { getDb } from "../db";
import { reservations } from "../../drizzle/schema";

/**
 * 매주 일요일 자정(00:00)에 모든 예약을 삭제하는 스케줄러
 */
export async function startWeeklyResetScheduler() {
  // 다음 일요일 자정까지의 시간(밀리초) 계산
  function getTimeUntilNextSunday() {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = 일요일, 1 = 월요일, ..., 6 = 토요일
    
    // 다음 일요일 자정 계산
    let daysUntilSunday: number;
    if (currentDay === 0) {
      // 오늘이 일요일이면 7일 후
      daysUntilSunday = 7;
    } else {
      // 그 외의 경우 남은 일수 계산
      daysUntilSunday = 7 - currentDay;
    }
    
    const nextSunday = new Date(now);
    nextSunday.setDate(nextSunday.getDate() + daysUntilSunday);
    nextSunday.setHours(0, 0, 0, 0); // 자정으로 설정
    
    return nextSunday.getTime() - now.getTime();
  }

  /**
   * 모든 예약 삭제
   */
  async function deleteAllReservations() {
    try {
      const db = await getDb();
      if (!db) {
        console.warn("[Scheduler] Database not available for weekly reset");
        return;
      }

      await db.delete(reservations);
      console.log(`[Scheduler] Weekly reset completed at ${new Date().toISOString()}`);
    } catch (error) {
      console.error("[Scheduler] Failed to delete reservations:", error);
    }
  }

  /**
   * 스케줄러 시작
   */
  function scheduleNextReset() {
    const timeUntilNextReset = getTimeUntilNextSunday();
    
    console.log(
      `[Scheduler] Next weekly reset scheduled in ${Math.round(timeUntilNextReset / 1000 / 60)} minutes`
    );

    setTimeout(async () => {
      await deleteAllReservations();
      // 다음 리셋을 위해 재귀적으로 스케줄 설정
      scheduleNextReset();
    }, timeUntilNextReset);
  }

  // 스케줄러 시작
  scheduleNextReset();
}
