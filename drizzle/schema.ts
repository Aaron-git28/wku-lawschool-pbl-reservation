import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * 스터디룸 테이블
 * 6개의 고정된 방 정보를 저장
 */
export const studyRooms = mysqlTable("study_rooms", {
  id: int("id").autoincrement().primaryKey(),
  roomNumber: varchar("room_number", { length: 10 }).notNull().unique(), // 407, 408, 409, 523, 524, 525
  floor: int("floor").notNull(), // 4층 또는 5층
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StudyRoom = typeof studyRooms.$inferSelect;
export type InsertStudyRoom = typeof studyRooms.$inferInsert;

/**
 * 학생 정보 테이블
 * 예약에 참여하는 학생들의 정보를 저장
 */
export const students = mysqlTable("students", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(), // 학생 성명
  classNumber: varchar("class_number", { length: 20 }).notNull(), // 기수
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

/**
 * 예약 테이블
 * 스터디룸 예약 정보를 저장
 * 각 예약은 2명의 학생이 참여
 */
export const reservations = mysqlTable("reservations", {
  id: int("id").autoincrement().primaryKey(),
  roomId: int("room_id").notNull().references(() => studyRooms.id, { onDelete: "cascade" }),
  reservationDate: timestamp("reservation_date").notNull(), // 예약 날짜
  startTime: int("start_time").notNull(), // 시작 시간 (0-23, 8-23 범위)
  endTime: int("end_time").notNull(), // 종료 시간 (startTime + 1)
  student1Id: int("student1_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  student2Id: int("student2_id").notNull().references(() => students.id, { onDelete: "cascade" }),
  createdBy: int("created_by").references(() => users.id, { onDelete: "cascade" }), // 예약 생성자 (로그인 없이 접근 가능하므로 nullable)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Reservation = typeof reservations.$inferSelect;
export type InsertReservation = typeof reservations.$inferInsert;