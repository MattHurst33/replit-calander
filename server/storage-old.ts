import {
  users,
  integrations,
  qualificationRules,
  meetings,
  emailReports,
  emailJobs,
  emailTemplates,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, gte, lte } from "drizzle-orm";

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

  async updateUserSettings(userId: number, settings: Record<string, any>): Promise<User | undefined> {
    const [updated] = await db
      .update(users)
      .set({ settings })
      .where(eq(users.id, userId))
      .returning();
    return updated || undefined;
  }

  async getUserSettings(userId: number): Promise<Record<string, any> | undefined> {
    const [user] = await db.select({ settings: users.settings }).from(users).where(eq(users.id, userId));
    return user?.settings || {};
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

  async getUserMeetings(userId: string, limit = 50): Promise<Meeting[]> {
    return await db
      .select()
      .from(meetings)
      .where(eq(meetings.userId, userId))
      .orderBy(desc(meetings.startTime))
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
    noShow: number;
    completed: number;
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
      noShow: allMeetings.filter(m => m.status === 'no_show').length,
      completed: allMeetings.filter(m => m.status === 'completed').length,
    };
  }

  async getNoShowAnalytics(userId: string, startDate?: Date, endDate?: Date): Promise<{
    totalNoShows: number;
    noShowRate: number;
    noShowsByTimeSlot: Array<{ hour: number; count: number }>;
    noShowsByIndustry: Array<{ industry: string; count: number }>;
    noShowsByCompanySize: Array<{ sizeRange: string; count: number }>;
    noShowsByRevenue: Array<{ revenueRange: string; count: number }>;
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

    const noShowMeetings = allMeetings.filter(m => m.status === 'no_show');
    const totalMeetings = allMeetings.filter(m => ['qualified', 'completed', 'no_show'].includes(m.status));
    
    const totalNoShows = noShowMeetings.length;
    const noShowRate = totalMeetings.length > 0 ? (totalNoShows / totalMeetings.length) * 100 : 0;

    // No-shows by time slot
    const timeSlotCounts: Record<number, number> = {};
    noShowMeetings.forEach(meeting => {
      const hour = new Date(meeting.startTime).getHours();
      timeSlotCounts[hour] = (timeSlotCounts[hour] || 0) + 1;
    });
    const noShowsByTimeSlot = Object.entries(timeSlotCounts).map(([hour, count]) => ({
      hour: parseInt(hour),
      count
    }));

    // No-shows by industry
    const industryCounts: Record<string, number> = {};
    noShowMeetings.forEach(meeting => {
      if (meeting.industry) {
        industryCounts[meeting.industry] = (industryCounts[meeting.industry] || 0) + 1;
      }
    });
    const noShowsByIndustry = Object.entries(industryCounts).map(([industry, count]) => ({
      industry,
      count
    }));

    // No-shows by company size
    const sizeCounts: Record<string, number> = {};
    noShowMeetings.forEach(meeting => {
      if (meeting.companySize) {
        let sizeRange;
        if (meeting.companySize < 10) sizeRange = '1-10';
        else if (meeting.companySize < 50) sizeRange = '11-50';
        else if (meeting.companySize < 200) sizeRange = '51-200';
        else if (meeting.companySize < 1000) sizeRange = '201-1000';
        else sizeRange = '1000+';
        
        sizeCounts[sizeRange] = (sizeCounts[sizeRange] || 0) + 1;
      }
    });
    const noShowsByCompanySize = Object.entries(sizeCounts).map(([sizeRange, count]) => ({
      sizeRange,
      count
    }));

    // No-shows by revenue
    const revenueCounts: Record<string, number> = {};
    noShowMeetings.forEach(meeting => {
      if (meeting.revenue) {
        const revenue = Number(meeting.revenue);
        let revenueRange;
        if (revenue < 10000) revenueRange = '$0-$10K';
        else if (revenue < 50000) revenueRange = '$10K-$50K';
        else if (revenue < 100000) revenueRange = '$50K-$100K';
        else if (revenue < 500000) revenueRange = '$100K-$500K';
        else revenueRange = '$500K+';
        
        revenueCounts[revenueRange] = (revenueCounts[revenueRange] || 0) + 1;
      }
    });
    const noShowsByRevenue = Object.entries(revenueCounts).map(([revenueRange, count]) => ({
      revenueRange,
      count
    }));

    return {
      totalNoShows,
      noShowRate: Math.round(noShowRate * 100) / 100,
      noShowsByTimeSlot,
      noShowsByIndustry,
      noShowsByCompanySize,
      noShowsByRevenue,
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

  async createEmailJob(job: InsertEmailJob): Promise<EmailJob> {
    const [newJob] = await db
      .insert(emailJobs)
      .values(job)
      .returning();
    return newJob;
  }

  async getUserEmailJobs(userId: number): Promise<EmailJob[]> {
    return await db
      .select()
      .from(emailJobs)
      .where(eq(emailJobs.userId, userId))
      .orderBy(desc(emailJobs.createdAt));
  }

  async getPendingEmailJobs(): Promise<EmailJob[]> {
    return await db
      .select()
      .from(emailJobs)
      .where(and(
        eq(emailJobs.status, 'pending'),
        lte(emailJobs.scheduledAt, new Date())
      ))
      .orderBy(emailJobs.scheduledAt);
  }

  async updateEmailJob(id: number, updates: Partial<InsertEmailJob>): Promise<EmailJob | undefined> {
    const [updated] = await db
      .update(emailJobs)
      .set(updates)
      .where(eq(emailJobs.id, id))
      .returning();
    return updated || undefined;
  }
}

export const storage = new DatabaseStorage();
