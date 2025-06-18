import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  settings: jsonb("settings").$type<Record<string, any>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'google_calendar', 'calendly', 'gmail'
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  settings: jsonb("settings").$type<Record<string, any>>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const qualificationRules = pgTable("qualification_rules", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  field: text("field").notNull(), // 'revenue', 'company_size', 'industry', 'budget'
  operator: text("operator").notNull(), // 'gte', 'lte', 'eq', 'ne', 'contains', 'not_contains'
  value: text("value").notNull(),
  priority: integer("priority").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  externalId: text("external_id").notNull(), // Google Calendar event ID
  title: text("title").notNull(),
  description: text("description"),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  attendeeEmail: text("attendee_email"),
  attendeeName: text("attendee_name"),
  company: text("company"),
  revenue: decimal("revenue", { precision: 15, scale: 2 }),
  companySize: integer("company_size"),
  industry: text("industry"),
  budget: decimal("budget", { precision: 15, scale: 2 }),
  status: text("status").notNull().default('pending'), // 'qualified', 'disqualified', 'needs_review', 'pending', 'no_show', 'completed'
  qualificationReason: text("qualification_reason"),
  formData: jsonb("form_data").$type<Record<string, any>>(),
  noShowMarkedAt: timestamp("no_show_marked_at"),
  noShowReason: text("no_show_reason"), // 'did_not_attend', 'cancelled_late', 'rescheduled_no_show'
  lastProcessed: timestamp("last_processed"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailReports = pgTable("email_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  reportDate: timestamp("report_date").notNull(),
  totalMeetings: integer("total_meetings").notNull(),
  qualifiedMeetings: integer("qualified_meetings").notNull(),
  disqualifiedMeetings: integer("disqualified_meetings").notNull(),
  needsReviewMeetings: integer("needs_review_meetings").notNull(),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailJobs = pgTable("email_jobs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  meetingId: integer("meeting_id").notNull().references(() => meetings.id),
  type: text("type").notNull(), // 'confirmation', 'reminder', 'followup'
  status: text("status").notNull().default('pending'), // 'pending', 'sent', 'failed'
  scheduledAt: timestamp("scheduled_at").notNull(),
  sentAt: timestamp("sent_at"),
  retryCount: integer("retry_count").default(0).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  integrations: many(integrations),
  qualificationRules: many(qualificationRules),
  meetings: many(meetings),
  emailReports: many(emailReports),
  emailJobs: many(emailJobs),
  emailTemplates: many(emailTemplates),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  user: one(users, {
    fields: [integrations.userId],
    references: [users.id],
  }),
}));

export const qualificationRulesRelations = relations(qualificationRules, ({ one }) => ({
  user: one(users, {
    fields: [qualificationRules.userId],
    references: [users.id],
  }),
}));

export const meetingsRelations = relations(meetings, ({ one }) => ({
  user: one(users, {
    fields: [meetings.userId],
    references: [users.id],
  }),
}));

export const emailReportsRelations = relations(emailReports, ({ one }) => ({
  user: one(users, {
    fields: [emailReports.userId],
    references: [users.id],
  }),
}));

export const emailJobsRelations = relations(emailJobs, ({ one }) => ({
  user: one(users, {
    fields: [emailJobs.userId],
    references: [users.id],
  }),
  meeting: one(meetings, {
    fields: [emailJobs.meetingId],
    references: [meetings.id],
  }),
}));

export const emailTemplatesRelations = relations(emailTemplates, ({ one }) => ({
  user: one(users, {
    fields: [emailTemplates.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertIntegrationSchema = createInsertSchema(integrations).omit({
  id: true,
  createdAt: true,
});

export const insertQualificationRuleSchema = createInsertSchema(qualificationRules).omit({
  id: true,
  createdAt: true,
});

export const insertMeetingSchema = createInsertSchema(meetings).omit({
  id: true,
  createdAt: true,
});

export const insertEmailReportSchema = createInsertSchema(emailReports).omit({
  id: true,
  createdAt: true,
});

export const insertEmailJobSchema = createInsertSchema(emailJobs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;

export type QualificationRule = typeof qualificationRules.$inferSelect;
export type InsertQualificationRule = z.infer<typeof insertQualificationRuleSchema>;

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;

export type EmailReport = typeof emailReports.$inferSelect;
export type InsertEmailReport = z.infer<typeof insertEmailReportSchema>;

export type EmailJob = typeof emailJobs.$inferSelect;
export type InsertEmailJob = z.infer<typeof insertEmailJobSchema>;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
