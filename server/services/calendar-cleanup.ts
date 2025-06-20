import { storage } from "../storage";
import { CalendlyService } from "./calendly";
import { eq, and } from "drizzle-orm";
import { meetings } from "@shared/schema";
import { db } from "../db";

export class CalendarCleanupService {
  private calendlyService: CalendlyService;
  private isProcessing: boolean = false;

  constructor() {
    this.calendlyService = new CalendlyService();
  }

  async startProcessing() {
    if (this.isProcessing) {
      console.log("Calendar cleanup already running");
      return;
    }

    this.isProcessing = true;
    console.log("Calendar cleanup service started");
    
    // Process immediately, then every 5 minutes
    await this.processCleanup();
    setInterval(async () => {
      await this.processCleanup();
    }, 5 * 60 * 1000); // 5 minutes
  }

  private async processCleanup() {
    try {
      console.log("Processing calendar cleanup...");
      
      // Get all users with calendar cleanup enabled
      const usersWithCleanup = await this.getUsersWithCleanupEnabled();
      
      for (const userId of usersWithCleanup) {
        await this.cleanupUserCalendar(userId);
      }
      
      console.log("Calendar cleanup completed");
    } catch (error) {
      console.error("Error in calendar cleanup process:", error);
    }
  }

  private async getUsersWithCleanupEnabled(): Promise<string[]> {
    try {
      // Get all users who have calendar cleanup enabled
      const users = await db
        .select({ userId: meetings.userId })
        .from(meetings)
        .groupBy(meetings.userId);
      
      const usersWithCleanup: string[] = [];
      
      for (const user of users) {
        const settings = await storage.getUserSettings(user.userId);
        if (settings?.autoDeleteDisqualified) {
          usersWithCleanup.push(user.userId);
        }
      }
      
      return usersWithCleanup;
    } catch (error) {
      console.error("Error getting users with cleanup enabled:", error);
      return [];
    }
  }

  private async cleanupUserCalendar(userId: string) {
    try {
      console.log(`Processing calendar cleanup for user: ${userId}`);
      
      // Get disqualified meetings that haven't been deleted from calendar yet
      const disqualifiedMeetings = await db
        .select()
        .from(meetings)
        .where(
          and(
            eq(meetings.userId, userId),
            eq(meetings.qualificationStatus, "disqualified"),
            eq(meetings.calendarDeleted, false),
            eq(meetings.status, "scheduled") // Only delete scheduled meetings
          )
        );

      console.log(`Found ${disqualifiedMeetings.length} disqualified meetings to clean up`);

      for (const meeting of disqualifiedMeetings) {
        await this.deleteFromCalendar(meeting);
      }
    } catch (error) {
      console.error(`Error cleaning up calendar for user ${userId}:`, error);
    }
  }

  private async deleteFromCalendar(meeting: any) {
    try {
      console.log(`Deleting meeting from calendar: ${meeting.title} (${meeting.externalId})`);
      
      // Try to cancel the meeting in Calendly if it's a Calendly meeting
      if (meeting.externalId) {
        try {
          // Note: Calendly API doesn't support cancelling meetings programmatically
          // This would need integration with Google Calendar API or similar
          // For now, we'll mark it as deleted in our system
          console.log(`Would cancel Calendly meeting: ${meeting.externalId}`);
        } catch (apiError) {
          console.log(`Could not cancel meeting via API: ${apiError}`);
          // Continue with local deletion even if API call fails
        }
      }

      // Update the meeting record to mark it as deleted from calendar
      await db
        .update(meetings)
        .set({
          calendarDeleted: true,
          deletedAt: new Date(),
          status: "cancelled",
          updatedAt: new Date()
        })
        .where(eq(meetings.id, meeting.id));

      console.log(`Successfully marked meeting as deleted: ${meeting.title}`);

      // Create a log entry for the deletion
      await this.logCalendarDeletion(meeting);

    } catch (error) {
      console.error(`Error deleting meeting ${meeting.id}:`, error);
    }
  }

  private async logCalendarDeletion(meeting: any) {
    try {
      // Create an email job to notify about the deletion if needed
      const settings = await storage.getUserSettings(meeting.userId);
      
      if (settings?.notifyCalendarDeletions) {
        await storage.createEmailJob({
          userId: meeting.userId,
          type: "calendar_deletion",
          meetingId: meeting.id,
          scheduledAt: new Date(),
          status: "pending"
        });
      }
    } catch (error) {
      console.error("Error logging calendar deletion:", error);
    }
  }

  // Manual trigger for immediate cleanup
  async triggerCleanupForUser(userId: string): Promise<{ deleted: number; errors: string[] }> {
    const errors: string[] = [];
    let deleted = 0;

    try {
      const disqualifiedMeetings = await db
        .select()
        .from(meetings)
        .where(
          and(
            eq(meetings.userId, userId),
            eq(meetings.qualificationStatus, "disqualified"),
            eq(meetings.calendarDeleted, false),
            eq(meetings.status, "scheduled")
          )
        );

      for (const meeting of disqualifiedMeetings) {
        try {
          await this.deleteFromCalendar(meeting);
          deleted++;
        } catch (error) {
          errors.push(`Failed to delete meeting ${meeting.title}: ${error}`);
        }
      }

      return { deleted, errors };
    } catch (error) {
      errors.push(`Failed to retrieve disqualified meetings: ${error}`);
      return { deleted: 0, errors };
    }
  }

  // Get cleanup statistics for a user
  async getCleanupStats(userId: string): Promise<{
    totalDisqualified: number;
    deletedFromCalendar: number;
    pendingDeletion: number;
  }> {
    try {
      const allDisqualified = await db
        .select()
        .from(meetings)
        .where(
          and(
            eq(meetings.userId, userId),
            eq(meetings.qualificationStatus, "disqualified")
          )
        );

      const deletedFromCalendar = allDisqualified.filter(m => m.calendarDeleted).length;
      const pendingDeletion = allDisqualified.filter(
        m => !m.calendarDeleted && m.status === "scheduled"
      ).length;

      return {
        totalDisqualified: allDisqualified.length,
        deletedFromCalendar,
        pendingDeletion
      };
    } catch (error) {
      console.error("Error getting cleanup stats:", error);
      return {
        totalDisqualified: 0,
        deletedFromCalendar: 0,
        pendingDeletion: 0
      };
    }
  }
}

export const calendarCleanupService = new CalendarCleanupService();