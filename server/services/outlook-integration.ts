import axios from 'axios';
import { storage } from "../storage";
import { QualificationEngine } from "./qualification-engine";

export class OutlookIntegration {
  private qualificationEngine: QualificationEngine;

  constructor() {
    this.qualificationEngine = new QualificationEngine(storage);
  }

  // Get authorization URL for OAuth flow
  getAuthUrl(userId: string): string {
    const scopes = [
      'https://graph.microsoft.com/Calendars.Read',
      'https://graph.microsoft.com/Calendars.ReadWrite',
      'offline_access'
    ];

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?` +
           `client_id=${process.env.MICROSOFT_CLIENT_ID}&` +
           `response_type=code&` +
           `redirect_uri=${encodeURIComponent(process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/auth/outlook/callback')}&` +
           `scope=${encodeURIComponent(scopes.join(' '))}&` +
           `state=${userId}`;
  }

  // Exchange authorization code for tokens
  async exchangeCodeForTokens(code: string, userId: string): Promise<void> {
    try {
      const response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', 
        new URLSearchParams({
          client_id: process.env.MICROSOFT_CLIENT_ID || '',
          client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
          code: code,
          grant_type: 'authorization_code',
          redirect_uri: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5000/api/auth/outlook/callback'
        }), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const tokens = response.data;
      
      // Store tokens in database
      await storage.createIntegration({
        userId,
        type: 'outlook_calendar',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        settings: {
          scope: tokens.scope,
          expiresIn: tokens.expires_in,
          tokenType: tokens.token_type
        }
      });

      console.log(`Outlook integration created for user: ${userId}`);
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  // Get valid access token for Microsoft Graph API
  async getValidAccessToken(userId: string): Promise<string | null> {
    try {
      const integration = await storage.getIntegration(userId, 'outlook_calendar');
      
      if (!integration) {
        console.log(`No Outlook integration found for user: ${userId}`);
        return null;
      }

      // For now, return the stored access token
      // In production, you'd check expiry and refresh if needed
      return integration.accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      return null;
    }
  }

  // Scan and import meetings from Outlook Calendar
  async scanAndImportMeetings(userId: string): Promise<{ imported: number; processed: number }> {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      if (!accessToken) {
        throw new Error('Outlook Calendar not connected');
      }

      // Get events from the last 7 days and next 30 days
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - 7);
      const endTime = new Date();
      endTime.setDate(endTime.getDate() + 30);

      const response = await axios.get('https://graph.microsoft.com/v1.0/me/calendar/events', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        params: {
          $filter: `start/dateTime ge '${startTime.toISOString()}' and end/dateTime le '${endTime.toISOString()}'`,
          $orderby: 'start/dateTime',
          $top: 250,
          $select: 'id,subject,body,start,end,attendees,location,webLink,organizer,responseStatus'
        }
      });

      const events = response.data.value || [];
      let imported = 0;
      let processed = 0;

      for (const event of events) {
        // Skip non-meeting events
        if (this.isNonMeetingEvent(event)) continue;

        // Check if meeting already exists
        const existingMeeting = await storage.getMeetingByExternalId(userId, event.id);
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

      console.log(`Outlook Calendar scan completed for user ${userId}: ${imported} imported, ${processed} processed`);
      return { imported, processed };

    } catch (error) {
      console.error('Error scanning Outlook Calendar:', error);
      throw error;
    }
  }

  // Check if event is a meeting
  private isNonMeetingEvent(event: any): boolean {
    const title = event.subject?.toLowerCase() || '';
    
    // Skip personal events, holidays, reminders
    const skipKeywords = [
      'holiday', 'vacation', 'birthday', 'reminder', 'lunch', 'break',
      'personal', 'doctor', 'dentist', 'workout', 'gym', 'focus time'
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

  // Extract meeting data from Outlook event
  private extractMeetingData(event: any, userId: string): any {
    const attendees = event.attendees || [];
    const primaryAttendee = attendees.find((a: any) => 
      a.emailAddress?.address && !a.emailAddress.address.includes(event.organizer?.emailAddress?.address)
    ) || attendees[0];

    return {
      userId,
      externalId: `outlook_${event.id}`,
      title: event.subject || 'Untitled Meeting',
      description: event.body?.content || null,
      startTime: new Date(event.start.dateTime),
      endTime: new Date(event.end.dateTime),
      attendeeEmail: primaryAttendee?.emailAddress?.address || null,
      attendeeName: primaryAttendee?.emailAddress?.name || null,
      status: 'pending',
      formData: {
        source: 'outlook_calendar',
        location: event.location?.displayName,
        attendees: attendees.map((a: any) => ({
          email: a.emailAddress?.address,
          name: a.emailAddress?.name,
          responseStatus: a.status?.response
        })),
        eventLink: event.webLink,
        meetingType: this.detectMeetingType(event),
        organizerEmail: event.organizer?.emailAddress?.address
      }
    };
  }

  // Detect meeting type from event details
  private detectMeetingType(event: any): string {
    const title = event.subject?.toLowerCase() || '';
    const description = event.body?.content?.toLowerCase() || '';
    const content = `${title} ${description}`;

    if (content.includes('demo') || content.includes('demonstration')) return 'demo';
    if (content.includes('interview')) return 'interview';
    if (content.includes('sales') || content.includes('pitch')) return 'sales';
    if (content.includes('consultation') || content.includes('discovery')) return 'consultation';
    if (content.includes('follow up') || content.includes('followup')) return 'follow_up';
    if (content.includes('review') || content.includes('feedback')) return 'review';
    
    return 'meeting';
  }

  // Update meeting in Outlook Calendar
  async updateCalendarEvent(userId: string, externalId: string, updates: any): Promise<void> {
    try {
      const accessToken = await this.getValidAccessToken(userId);
      if (!accessToken) {
        throw new Error('Outlook Calendar not connected');
      }

      const eventId = externalId.replace('outlook_', '');

      if (updates.status === 'cancelled') {
        // Cancel the event
        await axios.delete(`https://graph.microsoft.com/v1.0/me/calendar/events/${eventId}`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      } else {
        // Update event details
        await axios.patch(`https://graph.microsoft.com/v1.0/me/calendar/events/${eventId}`, updates, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        });
      }

    } catch (error) {
      console.error('Error updating Outlook calendar event:', error);
      throw error;
    }
  }
}

export const outlookIntegration = new OutlookIntegration();