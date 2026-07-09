import { pgTable, text, varchar, serial, integer, boolean, timestamp, jsonb, decimal, index, uniqueIndex } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  settings: jsonb("settings").$type<Record<string, any>>().notNull().default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const integrations = pgTable("integrations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'google_calendar', 'calendly', 'gmail'
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  settings: jsonb("settings").$type<Record<string, any>>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const qualificationRules = pgTable("qualification_rules", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
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
  userId: varchar("user_id").notNull().references(() => users.id),
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
  calendarDeleted: boolean("calendar_deleted").default(false), // Track if deleted from calendar
  deletedAt: timestamp("deleted_at"), // When it was deleted from calendar
  inviteAccepted: boolean("invite_accepted"),
  inviteStatus: varchar("invite_status", { length: 50 }), // 'sent', 'accepted', 'declined', 'pending', 'unknown'
  inviteLastChecked: timestamp("invite_last_checked"),
  attendeeResponses: jsonb("attendee_responses"), // Store individual attendee responses
  autoRescheduleAttempts: integer("auto_reschedule_attempts").default(0),
  lastRescheduleAttempt: timestamp("last_reschedule_attempt"),
  rescheduleEmailSent: boolean("reschedule_email_sent").default(false),
  originalMeetingTime: timestamp("original_meeting_time"), // Store original time for tracking
  lastProcessed: timestamp("last_processed"),
  companyResearchStatus: text("company_research_status"), // 'unresolved', 'timeout', 'completed' — see companyCache; independent of qualification `status`
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Company research cache — keyed by normalized (companyName, domain). AD-9: 24h TTL, stale-while-revalidate.
// Story 1.1 owns overview fields; Stories 1.2-1.6 each add one field to this same record (see Dev Notes in story file).
export const companyCache = pgTable(
  "company_cache",
  {
    id: serial("id").primaryKey(),
    companyName: text("company_name").notNull(), // normalized: lowercased, trimmed
    domain: text("domain"), // normalized; null when resolved via title/description rather than email domain
    overview: text("overview"),
    industry: text("industry"),
    revenueRange: text("revenue_range"), // human-readable, e.g. "$10M-$50M" — meetings.revenue stores a numeric point-estimate derived from this
    employeeCount: integer("employee_count"),
    headquarters: text("headquarters"),
    foundingYear: integer("founding_year"),
    productsServices: jsonb("products_services").$type<string[]>(), // top 3-5 product/service names, or [] if not confidently known (FR-2.3, Story 1.2)
    source: text("source").notNull(), // which data source produced this record, e.g. 'openai'
    researchedAt: timestamp("researched_at").notNull(), // drives the 24h stale-while-revalidate check
    refreshQueuedAt: timestamp("refresh_queued_at"), // prevents duplicate concurrent background refreshes
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [uniqueIndex("IDX_company_cache_name_domain").on(table.companyName, table.domain)],
);

export const emailReports = pgTable("email_reports", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
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
  userId: varchar("user_id").notNull().references(() => users.id),
  meetingId: integer("meeting_id").notNull().references(() => meetings.id),
  type: text("type").notNull(), // 'confirmation', 'reminder', 'followup', 'qualified_appointment'
  status: text("status").notNull().default('pending'), // 'pending', 'sent', 'failed'
  scheduledAt: timestamp("scheduled_at").notNull(),
  sentAt: timestamp("sent_at"),
  retryCount: integer("retry_count").default(0).notNull(),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const emailTemplates = pgTable("email_templates", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'qualified_appointment', 'follow_up', 'reminder'
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Time tracking for grooming efficiency
export const groomingMetrics = pgTable("grooming_metrics", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  totalMeetings: integer("total_meetings").default(0).notNull(),
  qualifiedMeetings: integer("qualified_meetings").default(0).notNull(),
  disqualifiedMeetings: integer("disqualified_meetings").default(0).notNull(),
  autoQualifiedMeetings: integer("auto_qualified_meetings").default(0).notNull(),
  autoDisqualifiedMeetings: integer("auto_disqualified_meetings").default(0).notNull(),
  manualReviewMeetings: integer("manual_review_meetings").default(0).notNull(),
  timeSpentGroomingMinutes: integer("time_spent_grooming_minutes").default(0).notNull(),
  timeSavedMinutes: integer("time_saved_minutes").default(0).notNull(),
  automationAccuracy: decimal("automation_accuracy", { precision: 5, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  integrations: many(integrations),
  qualificationRules: many(qualificationRules),
  meetings: many(meetings),
  emailReports: many(emailReports),
  emailJobs: many(emailJobs),
  emailTemplates: many(emailTemplates),
  groomingMetrics: many(groomingMetrics),
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

export const groomingMetricsRelations = relations(groomingMetrics, ({ one }) => ({
  user: one(users, {
    fields: [groomingMetrics.userId],
    references: [users.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
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

export const insertCompanyCacheSchema = createInsertSchema(companyCache, {
  // drizzle-zod maps jsonb columns to a generic recursive Json schema by default, which doesn't
  // match this column's `.$type<string[]>()` — override explicitly so InsertCompanyCache lines up
  // with what Drizzle's own insert/update types expect for this column.
  productsServices: z.array(z.string()).nullable().optional(),
}).omit({
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

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpsertUser = typeof users.$inferInsert;


export type Integration = typeof integrations.$inferSelect;
export type InsertIntegration = z.infer<typeof insertIntegrationSchema>;

export type QualificationRule = typeof qualificationRules.$inferSelect;
export type InsertQualificationRule = z.infer<typeof insertQualificationRuleSchema>;

export type Meeting = typeof meetings.$inferSelect;
export type InsertMeeting = z.infer<typeof insertMeetingSchema>;

export type CompanyCache = typeof companyCache.$inferSelect;
export type InsertCompanyCache = z.infer<typeof insertCompanyCacheSchema>;

export type EmailReport = typeof emailReports.$inferSelect;
export type InsertEmailReport = z.infer<typeof insertEmailReportSchema>;

export type EmailJob = typeof emailJobs.$inferSelect;
export type InsertEmailJob = z.infer<typeof insertEmailJobSchema>;

export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;

export const insertGroomingMetricsSchema = createInsertSchema(groomingMetrics).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type GroomingMetrics = typeof groomingMetrics.$inferSelect;
export type InsertGroomingMetrics = z.infer<typeof insertGroomingMetricsSchema>;
