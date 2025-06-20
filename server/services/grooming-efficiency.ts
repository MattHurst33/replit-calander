import { storage } from "../storage";
import { groomingMetrics } from "@shared/schema";
import { db } from "../db";
import { eq, and, gte, lte } from "drizzle-orm";

export class GroomingEfficiencyService {
  private isProcessing: boolean = false;

  constructor() {}

  async startProcessing() {
    if (this.isProcessing) {
      console.log("Grooming efficiency tracking already running");
      return;
    }

    this.isProcessing = true;
    console.log("Grooming efficiency service started");
    
    // Process immediately, then every hour
    await this.processWeeklyMetrics();
    setInterval(async () => {
      await this.processWeeklyMetrics();
    }, 60 * 60 * 1000); // 1 hour
  }

  private async processWeeklyMetrics() {
    try {
      console.log("Processing weekly grooming metrics...");
      
      // Get all users
      const users = await db
        .select({ userId: groomingMetrics.userId })
        .from(groomingMetrics)
        .groupBy(groomingMetrics.userId);
      
      const currentWeek = this.getCurrentWeekBounds();
      
      for (const user of users) {
        await this.calculateUserWeeklyMetrics(user.userId, currentWeek);
      }
      
      console.log("Weekly grooming metrics processed");
    } catch (error) {
      console.error("Error processing weekly metrics:", error);
    }
  }

  private getCurrentWeekBounds(): { start: Date; end: Date } {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Adjust for Monday start
    
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysToMonday);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    return { start: weekStart, end: weekEnd };
  }

  async calculateUserWeeklyMetrics(userId: string, weekBounds: { start: Date; end: Date }) {
    try {
      // Check if metrics already exist for this week
      const existingMetrics = await db
        .select()
        .from(groomingMetrics)
        .where(
          and(
            eq(groomingMetrics.userId, userId),
            eq(groomingMetrics.weekStart, weekBounds.start)
          )
        );

      // Get meetings data for the week
      const meetings = await storage.getUserMeetings(userId, 1000);
      const weekMeetings = meetings.filter(m => {
        const meetingDate = new Date(m.createdAt);
        return meetingDate >= weekBounds.start && meetingDate <= weekBounds.end;
      });

      const totalMeetings = weekMeetings.length;
      const qualifiedMeetings = weekMeetings.filter(m => m.status === 'qualified').length;
      const disqualifiedMeetings = weekMeetings.filter(m => m.status === 'disqualified').length;
      
      // Count auto-processed meetings (those with AI insights)
      const autoQualifiedMeetings = weekMeetings.filter(m => 
        m.status === 'qualified' && m.qualificationReason?.includes('AI')
      ).length;
      
      const autoDisqualifiedMeetings = weekMeetings.filter(m => 
        m.status === 'disqualified' && m.qualificationReason?.includes('AI')
      ).length;
      
      const manualReviewMeetings = weekMeetings.filter(m => 
        m.status === 'needs_review'
      ).length;

      // Calculate time savings
      const avgTimePerMeetingReview = 5; // minutes per meeting review
      const timeSavedFromAutomation = (autoQualifiedMeetings + autoDisqualifiedMeetings) * avgTimePerMeetingReview;
      const timeSpentOnManualReview = manualReviewMeetings * avgTimePerMeetingReview;
      
      // Calculate automation accuracy
      const totalAutomated = autoQualifiedMeetings + autoDisqualifiedMeetings;
      const automationAccuracy = totalMeetings > 0 ? (totalAutomated / totalMeetings) * 100 : 0;

      const metricsData = {
        userId,
        weekStart: weekBounds.start,
        weekEnd: weekBounds.end,
        totalMeetings,
        qualifiedMeetings,
        disqualifiedMeetings,
        autoQualifiedMeetings,
        autoDisqualifiedMeetings,
        manualReviewMeetings,
        timeSpentGroomingMinutes: timeSpentOnManualReview,
        timeSavedMinutes: timeSavedFromAutomation,
        automationAccuracy: automationAccuracy.toString(),
      };

      if (existingMetrics.length > 0) {
        // Update existing metrics
        await db
          .update(groomingMetrics)
          .set({
            ...metricsData,
            updatedAt: new Date(),
          })
          .where(eq(groomingMetrics.id, existingMetrics[0].id));
      } else {
        // Create new metrics
        await db.insert(groomingMetrics).values(metricsData);
      }

    } catch (error) {
      console.error(`Error calculating metrics for user ${userId}:`, error);
    }
  }

  async getUserWeeklyMetrics(userId: string, weekStart?: Date): Promise<any> {
    try {
      const targetWeek = weekStart || this.getCurrentWeekBounds().start;
      
      const [metrics] = await db
        .select()
        .from(groomingMetrics)
        .where(
          and(
            eq(groomingMetrics.userId, userId),
            eq(groomingMetrics.weekStart, targetWeek)
          )
        );

      return metrics || null;
    } catch (error) {
      console.error("Error getting user weekly metrics:", error);
      return null;
    }
  }

  async getUserHistoricalMetrics(userId: string, weeks: number = 12): Promise<any[]> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (weeks * 7));

      const metrics = await db
        .select()
        .from(groomingMetrics)
        .where(
          and(
            eq(groomingMetrics.userId, userId),
            gte(groomingMetrics.weekStart, startDate)
          )
        )
        .orderBy(groomingMetrics.weekStart);

      return metrics;
    } catch (error) {
      console.error("Error getting historical metrics:", error);
      return [];
    }
  }

  async getTeamEfficiencyReport(teamUserIds: string[], weeks: number = 4): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - (weeks * 7));

      const teamMetrics = [];
      
      for (const userId of teamUserIds) {
        const userMetrics = await db
          .select()
          .from(groomingMetrics)
          .where(
            and(
              eq(groomingMetrics.userId, userId),
              gte(groomingMetrics.weekStart, startDate)
            )
          );
        
        if (userMetrics.length > 0) {
          const totalTimeSaved = userMetrics.reduce((sum, m) => sum + m.timeSavedMinutes, 0);
          const totalMeetings = userMetrics.reduce((sum, m) => sum + m.totalMeetings, 0);
          const avgAccuracy = userMetrics.reduce((sum, m) => sum + parseFloat(m.automationAccuracy), 0) / userMetrics.length;
          
          teamMetrics.push({
            userId,
            totalTimeSavedMinutes: totalTimeSaved,
            totalMeetingsProcessed: totalMeetings,
            averageAccuracy: avgAccuracy,
            weeksTracked: userMetrics.length
          });
        }
      }

      return {
        teamMetrics,
        summary: {
          totalTimeSaved: teamMetrics.reduce((sum, m) => sum + m.totalTimeSavedMinutes, 0),
          totalMeetings: teamMetrics.reduce((sum, m) => sum + m.totalMeetingsProcessed, 0),
          averageTeamAccuracy: teamMetrics.length > 0 
            ? teamMetrics.reduce((sum, m) => sum + m.averageAccuracy, 0) / teamMetrics.length 
            : 0
        }
      };
    } catch (error) {
      console.error("Error generating team efficiency report:", error);
      return { teamMetrics: [], summary: { totalTimeSaved: 0, totalMeetings: 0, averageTeamAccuracy: 0 } };
    }
  }

  async triggerMetricsCalculation(userId: string): Promise<void> {
    const currentWeek = this.getCurrentWeekBounds();
    await this.calculateUserWeeklyMetrics(userId, currentWeek);
  }
}

export const groomingEfficiencyService = new GroomingEfficiencyService();