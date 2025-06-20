import {
  users,
  integrations,
  qualificationRules,
  meetings,
  emailReports,
  emailJobs,
  emailTemplates,
  groomingMetrics,
  type User,
  type UpsertUser,
  type Integration,
  type InsertIntegration,
  type QualificationRule,
  type InsertQualificationRule,
  type Meeting,
  type InsertMeeting,
  type EmailReport,
  type InsertEmailReport,
  type EmailJob,
  type InsertEmailJob,
  type EmailTemplate,
  type InsertEmailTemplate,
  type GroomingMetrics,
  type InsertGroomingMetrics,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, count, sql } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User methods
  // (IMPORTANT) these user operations are mandatory for Replit Auth.
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  updateUserSettings(userId: string, settings: Record<string, any>): Promise<User | undefined>;
  getUserSettings(userId: string): Promise<Record<string, any> | undefined>;

  // Integration methods
  getUserIntegrations(userId: string): Promise<Integration[]>;
  getIntegration(userId: string, type: string): Promise<Integration | undefined>;
  createIntegration(integration: InsertIntegration): Promise<Integration>;
  updateIntegration(id: number, updates: Partial<InsertIntegration>): Promise<Integration | undefined>;

  // Qualification rule methods
  getUserQualificationRules(userId: string): Promise<QualificationRule[]>;
  createQualificationRule(rule: InsertQualificationRule): Promise<QualificationRule>;
  updateQualificationRule(id: number, updates: Partial<InsertQualificationRule>): Promise<QualificationRule | undefined>;
  deleteQualificationRule(id: number): Promise<boolean>;

  // Meeting methods
  getUserMeetings(userId: string, limit?: number): Promise<Meeting[]>;
  getMeetingByExternalId(userId: string, externalId: string): Promise<Meeting | undefined>;
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  updateMeeting(id: number, updates: Partial<InsertMeeting>): Promise<Meeting | undefined>;
  getMeetingStats(userId: string, startDate?: Date, endDate?: Date): Promise<{
    total: number;
    qualified: number;
    disqualified: number;
    needsReview: number;
    noShow: number;
    completed: number;
  }>;

  getNoShowAnalytics(userId: string, startDate?: Date, endDate?: Date): Promise<{
    totalNoShows: number;
    noShowRate: number;
    noShowsByTimeSlot: Array<{ hour: number; count: number }>;
    noShowsByIndustry: Array<{ industry: string; count: number }>;
    noShowsByCompanySize: Array<{ sizeRange: string; count: number }>;
    noShowsByRevenue: Array<{ revenueRange: string; count: number }>;
  }>;

  // Email report methods
  createEmailReport(report: InsertEmailReport): Promise<EmailReport>;
  getUserEmailReports(userId: string): Promise<EmailReport[]>;

  // Email job methods
  createEmailJob(job: InsertEmailJob): Promise<EmailJob>;
  getUserEmailJobs(userId: string): Promise<EmailJob[]>;
  getPendingEmailJobs(): Promise<EmailJob[]>;
  updateEmailJob(id: number, updates: Partial<InsertEmailJob>): Promise<EmailJob | undefined>;

  // Email template methods
  getUserEmailTemplates(userId: string): Promise<EmailTemplate[]>;
  getEmailTemplate(id: number): Promise<EmailTemplate | undefined>;
  createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(id: number, updates: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(id: number): Promise<boolean>;

  // Grooming metrics methods
  getUserGroomingMetrics(userId: string, weekStart?: Date): Promise<GroomingMetrics | undefined>;
  getHistoricalGroomingMetrics(userId: string, weeks?: number): Promise<GroomingMetrics[]>;
  createGroomingMetrics(metrics: InsertGroomingMetrics): Promise<GroomingMetrics>;
  updateGroomingMetrics(id: number, updates: Partial<InsertGroomingMetrics>): Promise<GroomingMetrics | undefined>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  // (IMPORTANT) these user operations are mandatory for Replit Auth.

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async updateUserSettings(userId: string, settings: Record<string, any>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ settings })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  async getUserSettings(userId: string): Promise<Record<string, any> | undefined> {
    const [user] = await db.select({ settings: users.settings }).from(users).where(eq(users.id, userId));
    return user?.settings;
  }

  // Integration methods
  async getUserIntegrations(userId: string): Promise<Integration[]> {
    return await db.select().from(integrations).where(eq(integrations.userId, userId));
  }

  async getIntegration(userId: string, type: string): Promise<Integration | undefined> {
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
    const [integration] = await db
      .update(integrations)
      .set(updates)
      .where(eq(integrations.id, id))
      .returning();
    return integration || undefined;
  }

  // Qualification rule methods
  async getUserQualificationRules(userId: string): Promise<QualificationRule[]> {
    return await db
      .select()
      .from(qualificationRules)
      .where(eq(qualificationRules.userId, userId))
      .orderBy(qualificationRules.priority);
  }

  async createQualificationRule(rule: InsertQualificationRule): Promise<QualificationRule> {
    const [newRule] = await db
      .insert(qualificationRules)
      .values(rule)
      .returning();
    return newRule;
  }

  async updateQualificationRule(id: number, updates: Partial<InsertQualificationRule>): Promise<QualificationRule | undefined> {
    const [rule] = await db
      .update(qualificationRules)
      .set(updates)
      .where(eq(qualificationRules.id, id))
      .returning();
    return rule || undefined;
  }

  async deleteQualificationRule(id: number): Promise<boolean> {
    const result = await db
      .delete(qualificationRules)
      .where(eq(qualificationRules.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  // Meeting methods
  async getUserMeetings(userId: string, limit = 50): Promise<Meeting[]> {
    return await db
      .select()
      .from(meetings)
      .where(eq(meetings.userId, userId))
      .orderBy(meetings.startTime)
      .limit(limit);
  }

  async getMeetingByExternalId(userId: string, externalId: string): Promise<Meeting | undefined> {
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
    const [meeting] = await db
      .update(meetings)
      .set(updates)
      .where(eq(meetings.id, id))
      .returning();
    return meeting || undefined;
  }

  async getMeetingStats(userId: string, startDate?: Date, endDate?: Date): Promise<{
    total: number;
    qualified: number;
    disqualified: number;
    needsReview: number;
    noShow: number;
    completed: number;
  }> {
    let baseConditions = [eq(meetings.userId, userId)];
    
    if (startDate) {
      baseConditions.push(gte(meetings.startTime, startDate));
    }
    if (endDate) {
      baseConditions.push(lte(meetings.startTime, endDate));
    }

    const query = db
      .select({
        status: meetings.status,
        count: count(),
      })
      .from(meetings)
      .where(and(...baseConditions));

    const stats = await query.groupBy(meetings.status);

    const result = {
      total: 0,
      qualified: 0,
      disqualified: 0,
      needsReview: 0,
      noShow: 0,
      completed: 0,
    };

    stats.forEach((stat) => {
      result.total += stat.count;
      switch (stat.status) {
        case 'qualified':
          result.qualified = stat.count;
          break;
        case 'disqualified':
          result.disqualified = stat.count;
          break;
        case 'needs_review':
          result.needsReview = stat.count;
          break;
        case 'no_show':
          result.noShow = stat.count;
          break;
        case 'completed':
          result.completed = stat.count;
          break;
      }
    });

    return result;
  }

  async getNoShowAnalytics(userId: string, startDate?: Date, endDate?: Date): Promise<{
    totalNoShows: number;
    noShowRate: number;
    noShowsByTimeSlot: Array<{ hour: number; count: number }>;
    noShowsByIndustry: Array<{ industry: string; count: number }>;
    noShowsByCompanySize: Array<{ sizeRange: string; count: number }>;
    noShowsByRevenue: Array<{ revenueRange: string; count: number }>;
  }> {
    let conditions = [eq(meetings.userId, userId)];
    
    if (startDate) {
      conditions.push(gte(meetings.startTime, startDate));
    }
    if (endDate) {
      conditions.push(lte(meetings.startTime, endDate));
    }

    const baseQuery = db
      .select()
      .from(meetings)
      .where(and(...conditions));

    const totalMeetings = await baseQuery;
    const noShowMeetings = totalMeetings.filter(m => m.status === 'no_show');
    
    const totalNoShows = noShowMeetings.length;
    const noShowRate = totalMeetings.length > 0 ? totalNoShows / totalMeetings.length : 0;

    // No-shows by time slot
    const noShowsByTimeSlot = noShowMeetings.reduce((acc, meeting) => {
      const hour = meeting.startTime.getHours();
      const existing = acc.find(item => item.hour === hour);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ hour, count: 1 });
      }
      return acc;
    }, [] as Array<{ hour: number; count: number }>);

    // No-shows by industry
    const noShowsByIndustry = noShowMeetings.reduce((acc, meeting) => {
      const industry = meeting.industry || 'Unknown';
      const existing = acc.find(item => item.industry === industry);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ industry, count: 1 });
      }
      return acc;
    }, [] as Array<{ industry: string; count: number }>);

    // No-shows by company size
    const noShowsByCompanySize = noShowMeetings.reduce((acc, meeting) => {
      const size = meeting.companySize;
      let sizeRange = 'Unknown';
      if (size) {
        if (size <= 10) sizeRange = '1-10';
        else if (size <= 50) sizeRange = '11-50';
        else if (size <= 200) sizeRange = '51-200';
        else if (size <= 1000) sizeRange = '201-1000';
        else sizeRange = '1000+';
      }
      const existing = acc.find(item => item.sizeRange === sizeRange);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ sizeRange, count: 1 });
      }
      return acc;
    }, [] as Array<{ sizeRange: string; count: number }>);

    // No-shows by revenue
    const noShowsByRevenue = noShowMeetings.reduce((acc, meeting) => {
      const revenue = meeting.revenue ? parseFloat(meeting.revenue) : null;
      let revenueRange = 'Unknown';
      if (revenue) {
        if (revenue < 100000) revenueRange = '<$100K';
        else if (revenue < 1000000) revenueRange = '$100K-$1M';
        else if (revenue < 10000000) revenueRange = '$1M-$10M';
        else if (revenue < 100000000) revenueRange = '$10M-$100M';
        else revenueRange = '$100M+';
      }
      const existing = acc.find(item => item.revenueRange === revenueRange);
      if (existing) {
        existing.count++;
      } else {
        acc.push({ revenueRange, count: 1 });
      }
      return acc;
    }, [] as Array<{ revenueRange: string; count: number }>);

    return {
      totalNoShows,
      noShowRate,
      noShowsByTimeSlot,
      noShowsByIndustry,
      noShowsByCompanySize,
      noShowsByRevenue,
    };
  }

  // Email report methods
  async createEmailReport(report: InsertEmailReport): Promise<EmailReport> {
    const [newReport] = await db
      .insert(emailReports)
      .values(report)
      .returning();
    return newReport;
  }

  async getUserEmailReports(userId: string): Promise<EmailReport[]> {
    return await db
      .select()
      .from(emailReports)
      .where(eq(emailReports.userId, userId))
      .orderBy(emailReports.reportDate);
  }

  // Email job methods
  async createEmailJob(job: InsertEmailJob): Promise<EmailJob> {
    const [newJob] = await db
      .insert(emailJobs)
      .values(job)
      .returning();
    return newJob;
  }

  async getUserEmailJobs(userId: string): Promise<EmailJob[]> {
    return await db
      .select()
      .from(emailJobs)
      .where(eq(emailJobs.userId, userId))
      .orderBy(emailJobs.scheduledAt);
  }

  async getPendingEmailJobs(): Promise<EmailJob[]> {
    return await db
      .select()
      .from(emailJobs)
      .where(eq(emailJobs.status, 'pending'));
  }

  async updateEmailJob(id: number, updates: Partial<InsertEmailJob>): Promise<EmailJob | undefined> {
    const [job] = await db
      .update(emailJobs)
      .set(updates)
      .where(eq(emailJobs.id, id))
      .returning();
    return job || undefined;
  }

  // Email template methods
  async getUserEmailTemplates(userId: string): Promise<EmailTemplate[]> {
    return await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.userId, userId))
      .orderBy(emailTemplates.createdAt);
  }

  async getEmailTemplate(id: number): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(eq(emailTemplates.id, id));
    return template || undefined;
  }

  async createEmailTemplate(template: InsertEmailTemplate): Promise<EmailTemplate> {
    const [newTemplate] = await db
      .insert(emailTemplates)
      .values(template)
      .returning();
    return newTemplate;
  }

  async updateEmailTemplate(id: number, updates: Partial<InsertEmailTemplate>): Promise<EmailTemplate | undefined> {
    const [template] = await db
      .update(emailTemplates)
      .set(updates)
      .where(eq(emailTemplates.id, id))
      .returning();
    return template || undefined;
  }

  async deleteEmailTemplate(id: number): Promise<boolean> {
    const result = await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();