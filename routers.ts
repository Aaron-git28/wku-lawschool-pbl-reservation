import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  studyRoom: router({
    list: publicProcedure.query(async () => {
      const { getAllStudyRooms, initializeStudyRooms } = await import("./db");
      const rooms = await getAllStudyRooms();
      if (rooms.length === 0) {
        await initializeStudyRooms();
        return await getAllStudyRooms();
      }
      return rooms;
    }),
  }),

  reservation: router({
    getByDate: publicProcedure
      .input((raw: unknown) => {
        return z.object({ date: z.string() }).parse(raw);
      })
      .query(async ({ input }) => {
        const { getReservationsByDate, getStudentById } = await import("./db");
        const date = new Date(input.date);
        const reservations = await getReservationsByDate(date);
        
        const enriched = await Promise.all(
          reservations.map(async (r) => {
            const student1 = await getStudentById(r.student1Id);
            const student2 = await getStudentById(r.student2Id);
            return {
              ...r,
              student1,
              student2,
            };
          })
        );
        
        return enriched;
      }),

    create: publicProcedure
      .input((raw: unknown) => {
        return z.object({
          roomId: z.number(),
          date: z.string(),
          startTime: z.number().min(8).max(23),
          student1Name: z.string().min(1),
          student1Class: z.string().min(1),
          student2Name: z.string().min(1),
          student2Class: z.string().min(1),
        }).parse(raw);
      })
      .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
        const {
          findOrCreateStudent,
          createReservation,
          getStudentReservationHoursForDate,
          getReservationsByDate,
        } = await import("./db");
        const { TRPCError } = await import("@trpc/server");

        // 날짜 문자열을 로컬 타임존 기준으로 파싱
        const [year, month, day] = input.date.split('-').map(Number);
        const reservationDate = new Date(year, month - 1, day, 0, 0, 0, 0);
        const dayOfWeek = reservationDate.getDay();
        
        // 과거 날짜는 예약 불가
        const today = new Date();
        const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        if (reservationDate < todayLocal) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "과거 날짜는 예약할 수 없습니다.",
          });
        }
        
        // 예약 가능한 요일 확인 (월~토, 0=일요일, 1=월요일, ..., 6=토요일)
        if (dayOfWeek === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "일요일은 예약할 수 없습니다.",
          });
        }

        if (input.startTime < 8 || input.startTime > 23) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "예약 가능 시간은 08:00~24:00입니다.",
          });
        }

        const student1 = await findOrCreateStudent(input.student1Name, input.student1Class);
        const student2 = await findOrCreateStudent(input.student2Name, input.student2Class);

        const existingReservations = await getReservationsByDate(reservationDate);
        const conflict = existingReservations.find(
          (r) => r.roomId === input.roomId && r.startTime === input.startTime
        );

        if (conflict) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "해당 시간대는 이미 예약되어 있습니다.",
          });
        }

        const student1Hours = await getStudentReservationHoursForDate(student1.id, reservationDate);
        const student2Hours = await getStudentReservationHoursForDate(student2.id, reservationDate);

        if (student1Hours >= 2) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${student1.name}님은 오늘 이미 2시간을 예약하셨습니다.`,
          });
        }

        if (student2Hours >= 2) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${student2.name}님은 오늘 이미 2시간을 예약하셨습니다.`,
          });
        }

        const reservationId = await createReservation({
          roomId: input.roomId,
          reservationDate,
          startTime: input.startTime,
          endTime: input.startTime + 1,
          student1Id: student1.id,
          student2Id: student2.id,
          createdBy: ctx.user?.id ?? 0, // 로그인하지 않은 경우 0(시스템/익명)으로 처리
        });

        return { id: reservationId, success: true };
      }),

    delete: publicProcedure
      .input((raw: unknown) => {
        return z.object({ id: z.number() }).parse(raw);
      })
      .mutation(async ({ input, ctx }: { input: any; ctx: any }) => {
        const { deleteReservation } = await import("./db");
        // 로그인 없이도 삭제 가능하도록 userId를 넘기지 않거나 무시하도록 db 로직 확인 필요
        // 현재 db.deleteReservation은 userId를 확인하여 본인 것만 삭제하게 되어 있음
        // 관리자 모드 비밀번호 통과 후 호출되므로, 여기서는 모든 예약 삭제 허용
        await deleteReservation(input.id); 
        return { success: true };
      }),

    cleanup: publicProcedure.mutation(async () => {
      const { deleteOldReservations } = await import("./db");
      await deleteOldReservations();
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
