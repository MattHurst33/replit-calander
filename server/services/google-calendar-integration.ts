import { google } from 'googleapis';
import { storage } from "../storage";
import { QualificationEngine } from "./qualification-engine";

export class GoogleCalendarIntegration {
  private oauth2Client: any;
  private qualificationEngine: QualificationEngine;

  constructor() {
    this.qualificationEngine = new QualificationEngine(storage);
    
    // Initialize OAuth2 client
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
    );
  }

  // Get authorization URL for OAuth flow
  getAuthUrl(userId: string): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      state: userId // Pass user ID in state for callback
    });
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string, userId: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getAccessToken(code);
      
      // Store tokens in database
      await storage.createIntegration({
        userId,
        type: 'google_calendar',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        settings: {
          scope: tokens.scope,
          expiryDate: tokens.expiry_date
        }
      });

      console.log(`Google Calendar integration created for user: ${userId}`);
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  // Set up authenticated client for a user
  async setupAuthenticatedClient(userId: string): Promise<boolean> {
    try {
      const integration = await storage.getIntegration(userId, 'google_calendar');
      
      if (!integration) {
        console.log(`No Google Calendar integration found for user: ${userId}`);
        return false;
      }

      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken
      });

      // Check if token needs refresh
      if (this.oauth2Client.isTokenExpiring()) {
        await this.refreshAccessToken(userId, integration.id);
      }

      return true;
    } catch (error) {
      console.error('Error setting up authenticated client:', error);
      return false;
    }
  }

  // Refresh access token
  async refreshAccessToken(userId: string, integrationId: number): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.refreshAccessToken();
      
      await storage.updateIntegration(integrationId, {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        settings: {
          scope: tokens.scope,
          expiryDate: tokens.expiry_date
        }
      });

      this.oauth2Client.setCredentials(tokens);
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  // Scan and import meetings from Google Calendar
  async scanAndImportMeetings(userId: string): Promise<{ imported: number; processed: number }> {
    try {
      const isAuthenticated = await this.setupAuthenticatedClient(userId);
      if (!isAuthenticated) {
        throw new Error('Google Calendar not connected');
      }

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      
      // Get events from the last 7 days and next 30 days
      const timeMin = new Date();
      timeMin.setDate(timeMin.getDate() - 7);
      const timeMax = new Date();
      timeMax.setDate(timeMax.getDate() + 30);

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250
      });

      const events = response.data.items || [];
      let imported = 0;
      let processed = 0;

      for (const event of events) {
        if (!event.start?.dateTime || !event.end?.dateTime) continue;
        
        // Skip all-day events and non-meeting events
        if (this.isNonMeetingEvent(event)) continue;

        // Check if meeting already exists
        const existingMeeting = await storage.getMeetingByExternalId(userId, event.id!);
        if (existingMeeting) {
          processed++;
          continue;
        }

        // Extract meeting details
        const meetingData = this.extractMeetingData(event, userId);
        
        // Create meeting record
        const meeting = await storage.createMeeting(meetingData);
        imported++;

        // Run AI qualification on the meeting
        try {
          await this.qualificationEngine.qualifyMeeting(meeting.id);
          processed++;
        } catch (qualificationError) {
          console.error(`Failed to qualify meeting ${meeting.id}:`, qualificationError);
        }
      }

      console.log(`Google Calendar scan completed for user ${userId}: ${imported} imported, ${processed} processed`);
      return { imported, processed };

    } catch (error) {
      console.error('Error scanning Google Calendar:', error);
      throw error;
    }
  }

  // Check if event is a meeting (has attendees or specific keywords)
  private isNonMeetingEvent(event: any): boolean {
    const title = event.summary?.toLowerCase() || '';
    
    // Skip personal events, holidays, reminders
    const skipKeywords = [
      'holiday', 'vacation', 'birthday', 'reminder', 'lunch', 'break',
      'personal', 'doctor', 'dentist', 'workout', 'gym'
    ];

    if (skipKeywords.some(keyword => title.includes(keyword))) {
      return true;
    }

    // If no attendees and no meeting-related keywords, likely not a business meeting
    const hasAttendees = event.attendees && event.attendees.length > 1;
    const meetingKeywords = [
      'meeting', 'call', 'demo', 'interview', 'presentation', 'review',
      'standup', 'sync', 'catchup', 'discussion', 'consultation'
    ];
    
    const hasMeetingKeywords = meetingKeywords.some(keyword => title.includes(keyword));
    
    return !hasAttendees && !hasMeetingKeywords;
  }

  // Extract meeting data from Google Calendar event
  private extractMeetingData(event: any, userId: string): any {
    const attendees = event.attendees || [];
    const primaryAttendee = attendees.find((a: any) => !a.self && a.email) || attendees[0];

    return {
      userId,
      externalId: `gcal_${event.id}`,
      title: event.summary || 'Untitled Meeting',
      description: event.description || null,
      startTime: new Date(event.start.dateTime),
      endTime: new Date(event.end.dateTime),
      attendeeEmail: primaryAttendee?.email || null,
      attendeeName: primaryAttendee?.displayName || null,
      status: 'pending',
      formData: {
        source: 'google_calendar',
        location: event.location,
        attendees: attendees.map((a: any) => ({
          email: a.email,
          name: a.displayName,
          responseStatus: a.responseStatus
        })),
        eventLink: event.htmlLink,
        meetingType: this.detectMeetingType(event)
      }
    };
  }

  // Detect meeting type from event details
  private detectMeetingType(event: any): string {
    const title = event.summary?.toLowerCase() || '';
    const description = event.description?.toLowerCase() || '';
    const content = `${title} ${description}`;

    if (content.includes('demo') || content.includes('demonstration')) return 'demo';
    if (content.includes('interview')) return 'interview';
    if (content.includes('sales') || content.includes('pitch')) return 'sales';
    if (content.includes('consultation') || content.includes('discovery')) return 'consultation';
    if (content.includes('follow up') || content.includes('followup')) return 'follow_up';
    if (content.includes('review') || content.includes('feedback')) return 'review';
    
    return 'meeting';
  }

  // Update meeting in Google Calendar (e.g., cancel if disqualified)
  async updateCalendarEvent(userId: string, externalId: string, updates: any): Promise<void> {
    try {
      const isAuthenticated = await this.setupAuthenticatedClient(userId);
      if (!isAuthenticated) {
        throw new Error('Google Calendar not connected');
      }

      const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
      const eventId = externalId.replace('gcal_', '');

      if (updates.status === 'cancelled') {
        // Cancel the event
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: eventId
        });
      } else {
        // Update event details
        await calendar.events.patch({
          calendarId: 'primary',
          eventId: eventId,
          requestBody: updates
        });
      }

    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  // Set up automatic scanning for a user
  async setupAutomaticScanning(userId: string): Promise<void> {
    // This would set up webhooks or periodic scanning
    // For now, we'll rely on periodic scanning in the background service
    console.log(`Automatic scanning setup for user: ${userId}`);
  }
}

export const googleCalendarIntegration = new GoogleCalendarIntegration();