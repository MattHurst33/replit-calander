import { storage } from "../storage";
import { googleCalendarIntegration } from "./google-calendar-integration";
import { outlookIntegration } from "./outlook-integration";

export class CalendarScannerService {
  private isProcessing: boolean = false;

  constructor() {}

  async startProcessing() {
    if (this.isProcessing) {
      console.log("Calendar scanner already running");
      return;
    }

    this.isProcessing = true;
    console.log("Calendar scanner service started");
    
    // Process immediately, then every 15 minutes
    await this.processCalendarScans();
    setInterval(async () => {
      await this.processCalendarScans();
    }, 15 * 60 * 1000); // 15 minutes
  }

  private async processCalendarScans() {
    try {
      console.log("Processing calendar scans...");
      
      // Get all users with calendar integrations
      const usersWithIntegrations = await this.getUsersWithCalendarIntegrations();
      
      for (const user of usersWithIntegrations) {
        await this.scanUserCalendars(user.userId, user.integrations);
      }
      
      console.log("Calendar scans completed");
    } catch (error) {
      console.error("Error in calendar scan process:", error);
    }
  }

  private async getUsersWithCalendarIntegrations(): Promise<Array<{ userId: string; integrations: string[] }>> {
    try {
      // This would get all users with active calendar integrations
      // For now, return empty array since we need to implement proper integration storage
      return [];
    } catch (error) {
      console.error("Error getting users with calendar integrations:", error);
      return [];
    }
  }

  private async scanUserCalendars(userId: string, integrations: string[]) {
    try {
      console.log(`Scanning calendars for user: ${userId}`);
      
      const results = {
        google: { imported: 0, processed: 0 },
        outlook: { imported: 0, processed: 0 }
      };

      // Scan Google Calendar if connected
      if (integrations.includes('google_calendar')) {
        try {
          results.google = await googleCalendarIntegration.scanAndImportMeetings(userId);
        } catch (error) {
          console.error(`Error scanning Google Calendar for user ${userId}:`, error);
        }
      }

      // Scan Outlook Calendar if connected
      if (integrations.includes('outlook_calendar')) {
        try {
          results.outlook = await outlookIntegration.scanAndImportMeetings(userId);
        } catch (error) {
          console.error(`Error scanning Outlook Calendar for user ${userId}:`, error);
        }
      }

      console.log(`Calendar scan results for user ${userId}:`, results);
      
      // Update user's last scan timestamp
      await this.updateLastScanTime(userId);

    } catch (error) {
      console.error(`Error scanning calendars for user ${userId}:`, error);
    }
  }

  private async updateLastScanTime(userId: string) {
    try {
      const currentSettings = await storage.getUserSettings(userId) || {};
      await storage.updateUserSettings(userId, {
        ...currentSettings,
        lastCalendarScan: new Date()
      });
    } catch (error) {
      console.error(`Error updating last scan time for user ${userId}:`, error);
    }
  }

  // Manual trigger for immediate scanning
  async triggerScanForUser(userId: string): Promise<{ 
    google: { imported: number; processed: number };
    outlook: { imported: number; processed: number };
  }> {
    const results = {
      google: { imported: 0, processed: 0 },
      outlook: { imported: 0, processed: 0 }
    };

    try {
      // Check user's integrations
      const googleIntegration = await storage.getIntegration(userId, 'google_calendar');
      const outlookIntegration = await storage.getIntegration(userId, 'outlook_calendar');

      // Scan Google Calendar if connected
      if (googleIntegration) {
        try {
          results.google = await googleCalendarIntegration.scanAndImportMeetings(userId);
        } catch (error) {
          console.error(`Error in manual Google Calendar scan:`, error);
        }
      }

      // Scan Outlook Calendar if connected
      if (outlookIntegration) {
        try {
          results.outlook = await outlookIntegration.scanAndImportMeetings(userId);
        } catch (error) {
          console.error(`Error in manual Outlook Calendar scan:`, error);
        }
      }

      await this.updateLastScanTime(userId);
      return results;

    } catch (error) {
      console.error(`Error in manual calendar scan for user ${userId}:`, error);
      return results;
    }
  }

  // Get scan statistics for a user
  async getScanStats(userId: string): Promise<{
    lastScan: Date | null;
    connectedCalendars: string[];
    totalMeetingsImported: number;
  }> {
    try {
      const settings = await storage.getUserSettings(userId);
      const googleIntegration = await storage.getIntegration(userId, 'google_calendar');
      const outlookIntegration = await storage.getIntegration(userId, 'outlook_calendar');
      
      const connectedCalendars = [];
      if (googleIntegration) connectedCalendars.push('Google Calendar');
      if (outlookIntegration) connectedCalendars.push('Outlook Calendar');

      // Get total meetings imported from calendars
      const meetings = await storage.getUserMeetings(userId, 1000);
      const importedMeetings = meetings.filter(m => 
        m.externalId.startsWith('gcal_') || m.externalId.startsWith('outlook_')
      );

      return {
        lastScan: settings?.lastCalendarScan || null,
        connectedCalendars,
        totalMeetingsImported: importedMeetings.length
      };
    } catch (error) {
      console.error("Error getting scan stats:", error);
      return {
        lastScan: null,
        connectedCalendars: [],
        totalMeetingsImported: 0
      };
    }
  }
}

export const calendarScannerService = new CalendarScannerService();