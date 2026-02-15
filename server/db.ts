import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// 스터디룸 관련 쿼리
export async function getAllStudyRooms() {
  const db = await getDb();
  if (!db) return [];
  const { studyRooms } = await import("../drizzle/schema");
  return await db.select().from(studyRooms).orderBy(studyRooms.roomNumber);
}

export async function initializeStudyRooms() {
  const db = await getDb();
  if (!db) return;
  const { studyRooms } = await import("../drizzle/schema");
  
  const rooms = [
    { roomNumber: "407", floor: 4 },
    { roomNumber: "408", floor: 4 },
    { roomNumber: "409", floor: 4 },
    { roomNumber: "523", floor: 5 },
    { roomNumber: "524", floor: 5 },
    { roomNumber: "525", floor: 5 },
  ];

  for (const room of rooms) {
    await db.insert(studyRooms).values(room).onDuplicateKeyUpdate({ set: { floor: room.floor } });
  }
}

// 학생 관련 쿼리
export async function findOrCreateStudent(name: string, classNumber: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { students } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  const existing = await db
    .select()
    .from(students)
    .where(and(eq(students.name, name), eq(students.classNumber, classNumber)))
    .limit(1);

  if (existing.length > 0) {
    return existing[0]!;
  }

  const result = await db.insert(students).values({ name, classNumber });
  const insertId = (result as any).insertId as number;
  return await db.select().from(students).where(eq(students.id, insertId)).limit(1).then(r => r[0]!);
}

// 예약 관련 쿼리
export async function getReservationsByDateRange(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  const { reservations, studyRooms, students } = await import("../drizzle/schema");
  const { gte, lte, eq, and } = await import("drizzle-orm");

  return await db
    .select({
      id: reservations.id,
      roomId: reservations.roomId,
      roomNumber: studyRooms.roomNumber,
      reservationDate: reservations.reservationDate,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      student1: {
        id: students.id,
        name: students.name,
        classNumber: students.classNumber,
      },
      student2Id: reservations.student2Id,
      createdAt: reservations.createdAt,
    })
    .from(reservations)
    .innerJoin(studyRooms, eq(reservations.roomId, studyRooms.id))
    .innerJoin(students, eq(reservations.student1Id, students.id))
    .where(and(gte(reservations.reservationDate, startDate), lte(reservations.reservationDate, endDate)));
}

export async function getReservationsByDate(date: Date) {
  const db = await getDb();
  if (!db) return [];
  const { reservations, studyRooms, students } = await import("../drizzle/schema");
  const { eq, sql } = await import("drizzle-orm");

  // 로컬 타임존 기준으로 날짜 문자열 생성
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  return await db
    .select({
      id: reservations.id,
      roomId: reservations.roomId,
      roomNumber: studyRooms.roomNumber,
      reservationDate: reservations.reservationDate,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      student1Id: reservations.student1Id,
      student2Id: reservations.student2Id,
      createdBy: reservations.createdBy,
      createdAt: reservations.createdAt,
    })
    .from(reservations)
    .innerJoin(studyRooms, eq(reservations.roomId, studyRooms.id))
    .where(sql`DATE(${reservations.reservationDate}) = ${dateStr}`);
}

export async function createReservation(data: {
  roomId: number;
  reservationDate: Date;
  startTime: number;
  endTime: number;
  student1Id: number;
  student2Id: number;
  createdBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { reservations } = await import("../drizzle/schema");

  // 로컬 타임존 기준으로 날짜 저장
  const year = data.reservationDate.getFullYear();
  const month = String(data.reservationDate.getMonth() + 1).padStart(2, '0');
  const day = String(data.reservationDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;
  const reservationDateForDB = new Date(`${dateStr}T00:00:00`);

  const result = await db.insert(reservations).values({
    ...data,
    reservationDate: reservationDateForDB,
  });
  return (result as any).insertId as number;
}

export async function deleteReservation(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { reservations } = await import("../drizzle/schema");
  const { eq, and } = await import("drizzle-orm");

  await db.delete(reservations).where(and(eq(reservations.id, id), eq(reservations.createdBy, userId)));
}

export async function getStudentReservationHoursForDate(studentId: number, date: Date) {
  const db = await getDb();
  if (!db) return 0;
  const { reservations } = await import("../drizzle/schema");
  const { eq, or, sql, and } = await import("drizzle-orm");

  const dateStr = date.toISOString().split('T')[0];

  const result = await db
    .select({
      totalHours: sql<number>`SUM(${reservations.endTime} - ${reservations.startTime})`,
    })
    .from(reservations)
    .where(
      and(
        sql`DATE(${reservations.reservationDate}) = ${dateStr}`,
        or(eq(reservations.student1Id, studentId), eq(reservations.student2Id, studentId))
      )
    );

  return result[0]?.totalHours || 0;
}

export async function deleteOldReservations() {
  const db = await getDb();
  if (!db) return;
  const { reservations } = await import("../drizzle/schema");
  const { lt, sql } = await import("drizzle-orm");

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  await db.delete(reservations).where(lt(reservations.reservationDate, oneWeekAgo));
}

export async function getReservationWithDetails(id: number) {
  const db = await getDb();
  if (!db) return null;
  const { reservations, studyRooms, students } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  const result = await db
    .select({
      id: reservations.id,
      roomId: reservations.roomId,
      roomNumber: studyRooms.roomNumber,
      reservationDate: reservations.reservationDate,
      startTime: reservations.startTime,
      endTime: reservations.endTime,
      student1Id: reservations.student1Id,
      student2Id: reservations.student2Id,
      createdBy: reservations.createdBy,
      createdAt: reservations.createdAt,
    })
    .from(reservations)
    .innerJoin(studyRooms, eq(reservations.roomId, studyRooms.id))
    .where(eq(reservations.id, id))
    .limit(1);

  return result[0] || null;
}

export async function getStudentById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const { students } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");

  const result = await db.select().from(students).where(eq(students.id, id)).limit(1);
  return result[0] || null;
}
