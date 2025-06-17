import { 
  users, integrations, qualificationRules, meetings, emailReports,
  type User, type InsertUser,
  type Integration, type InsertIntegration,
  type QualificationRule, type InsertQualificationRule,
  type Meeting, type InsertMeeting,
  type EmailReport, type InsertEmailReport
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Integration methods
  getUserIntegrations(userId: number): Promise<Integration[]>;
  getIntegration(userId: number, type: string): Promise<Integration | undefined>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: number, updates: Partial<InsertIntegration>): Promise<Integration | undefined>;

  // Qualification rule methods
  getUserQualificationRules(userId: number): Promise<QualificationRule[]>;
  createQualificationRule(rule: InsertQualificationRule): Promise<QualificationRule>;
  updateQualificationRule(id: number, updates: Partial<InsertQualificationRule>): Promise<QualificationRule | undefined>;
  deleteQualificationRule(id: number): Promise<boolean>;

  // Meeting methods
  getUserMeetings(userId: number, limit?: number): Promise<Meeting[]>;
  getMeetingByExternalId(userId: number, externalId: string): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, updates: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  getMeetingStats(userId: number, startDate?: Date, endDate?: Date): Promise<{
    total: number;
    qualified: number;
    disqualified: number;
    needsReview: number;
  }>;

  // Email report methods
  createEmailReport(report: InsertEmailReport): Promise<EmailReport>;
  getUserEmailReports(userId: number): Promise<EmailReport[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUserIntegrations(userId: number): Promise<Integration[]> {
    return await db
      .select()
      .from(integrations)
      .where(eq(integrations.userId, userId));
  }

  async getIntegration(userId: number, type: string): Promise<Integration | undefined> {
    const [integration] = await db
      .select()
      .from(integrations)
      .where(and(eq(integrations.userId, userId), eq(integrations.type, type)));
    return integration || undefined;
  }

  async createIntegration(integration: InsertIntegration): Promise<Integration> {
    const [newIntegration] = await db
      .insert(integrations)
      .values(integration)
      .returning();
    return newIntegration;
  }

  async updateIntegration(id: number, updates: Partial<InsertIntegration>): Promise<Integration | undefined> {
    const [updated] = await db
      .update(integrations)
      .set(updates)
      .where(eq(integrations.id, id))
      .returning();
    return updated || undefined;
  }

  async getUserQualificationRules(userId: number): Promise<QualificationRule[]> {
    return await db
      .select()
      .from(qualificationRules)
      .where(eq(qualificationRules.userId, userId))
      .orderBy(desc(qualificationRules.priority));
  }

  async createQualificationRule(rule: InsertQualificationRule): Promise<QualificationRule> {
    const [newRule] = await db
      .insert(qualificationRules)
      .values(rule)
      .returning();
    return newRule;
  }

  async updateQualificationRule(id: number, updates: Partial<InsertQualificationRule>): Promise<QualificationRule | undefined> {
    const [updated] = await db
      .update(qualificationRules)
      .set(updates)
      .where(eq(qualificationRules.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteQualificationRule(id: number): Promise<boolean> {
    const result = await db
      .delete(qualificationRules)
      .where(eq(qualificationRules.id, id));
    return (result.rowCount || 0) > 0;
  }

  async getUserMeetings(userId: number, limit = 50): Promise<Meeting[]> {
    return await db
      .select()
      .from(meetings)
      .where(eq(meetings.userId, userId))
      .orderBy(desc(meetings.startTime))
      .limit(limit);
  }

  async getMeetingByExternalId(userId: number, externalId: string): Promise<Meeting | undefined> {
    const [meeting] = await db
      .select()
      .from(meetings)
      .where(and(eq(meetings.userId, userId), eq(meetings.externalId, externalId)));
    return meeting || undefined;
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const [newMeeting] = await db
      .insert(meetings)
      .values(meeting)
      .returning();
    return newMeeting;
  }

  async updateMeeting(id: number, updates: Partial<InsertMeeting>): Promise<Meeting | undefined> {
    const [updated] = await db
      .update(meetings)
      .set(updates)
      .where(eq(meetings.id, id))
      .returning();
    return updated || undefined;
  }

  async getMeetingStats(userId: number, startDate?: Date, endDate?: Date): Promise<{
    total: number;
    qualified: number;
    disqualified: number;
    needsReview: number;
  }> {
    const conditions = [eq(meetings.userId, userId)];
    
    if (startDate) {
      conditions.push(gte(meetings.startTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(meetings.startTime, endDate));
    }

    const allMeetings = await db
      .select()
      .from(meetings)
      .where(and(...conditions));

    return {
      total: allMeetings.length,
      qualified: allMeetings.filter(m => m.status === 'qualified').length,
      disqualified: allMeetings.filter(m => m.status === 'disqualified').length,
      needsReview: allMeetings.filter(m => m.status === 'needs_review').length,
    };
  }

  async createEmailReport(report: InsertEmailReport): Promise<EmailReport> {
    const [newReport] = await db
      .insert(emailReports)
      .values(report)
      .returning();
    return newReport;
  }

  async getUserEmailReports(userId: number): Promise<EmailReport[]> {
    return await db
      .select()
      .from(emailReports)
      .where(eq(emailReports.userId, userId))
      .orderBy(desc(emailReports.reportDate));
  }
}

export const storage = new DatabaseStorage();
