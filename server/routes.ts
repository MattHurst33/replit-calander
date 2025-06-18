import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertMeetingSchema, insertQualificationRuleSchema, insertIntegrationSchema } from "@shared/schema";
import { GoogleCalendarService } from "./services/google-calendar";
import { CalendlyService } from "./services/calendly";
import { QualificationEngine } from "./services/qualification-engine";
import { EmailService } from "./services/email-service";
import { GmailService } from "./services/gmail-service";

export async function registerRoutes(app: Express): Promise<Server> {
  const googleCalendar = new GoogleCalendarService();
  const calendly = new CalendlyService();
  const qualificationEngine = new QualificationEngine(storage);
  const emailService = new EmailService();
  const gmailService = new GmailService();

  // Mock user for now - in real app this would come from authentication
  const MOCK_USER_ID = 1;

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const stats = await storage.getMeetingStats(MOCK_USER_ID);
      const integrations = await storage.getUserIntegrations(MOCK_USER_ID);
      
      res.json({
        ...stats,
        integrations: {
          googleCalendar: integrations.find(i => i.type === 'google_calendar')?.isActive || false,
          calendly: integrations.find(i => i.type === 'calendly')?.isActive || false,
          gmail: integrations.find(i => i.type === 'gmail')?.isActive || false,
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Get meetings
  app.get("/api/meetings", async (req, res) => {
    try {
      const meetings = await storage.getUserMeetings(MOCK_USER_ID, 20);
      res.json(meetings);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch meetings" });
    }
  });

  // Update meeting status
  app.patch("/api/meetings/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, qualificationReason } = req.body;
      
      // Get meeting details before updating
      const meetings = await storage.getUserMeetings(MOCK_USER_ID, 1000);
      const meeting = meetings.find(m => m.id === parseInt(id));
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      const updated = await storage.updateMeeting(parseInt(id), {
        status,
        qualificationReason,
        lastProcessed: new Date(),
      });
      
      // If meeting is being disqualified, free up the Google Calendar slot
      if (status === 'disqualified' && meeting.externalId) {
        try {
          const googleCalendarIntegration = await storage.getIntegration(MOCK_USER_ID, 'google_calendar');
          
          if (googleCalendarIntegration && googleCalendarIntegration.accessToken) {
            let eventId = meeting.externalId;
            
            // Skip Calendly events as they manage their own calendar
            if (!eventId.startsWith('calendly_')) {
              // Remove prefix for Google Calendar events
              if (eventId.startsWith('gcal_')) {
                eventId = eventId.replace('gcal_', '');
              }
              
              await googleCalendar.markEventAsFree(googleCalendarIntegration.accessToken, eventId);
              console.log(`Freed calendar slot for disqualified meeting: ${eventId}`);
            }
          }
        } catch (calendarError) {
          console.error('Failed to free calendar slot:', calendarError);
          // Don't fail the status update if calendar update fails
        }
      }
      
      if (!updated) {
        return res.status(404).json({ message: "Meeting not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update meeting" });
    }
  });

  // Get qualification rules
  app.get("/api/qualification-rules", async (req, res) => {
    try {
      const rules = await storage.getUserQualificationRules(MOCK_USER_ID);
      res.json(rules);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch qualification rules" });
    }
  });

  // Create qualification rule
  app.post("/api/qualification-rules", async (req, res) => {
    try {
      const ruleData = insertQualificationRuleSchema.parse({
        ...req.body,
        userId: MOCK_USER_ID,
      });
      
      const rule = await storage.createQualificationRule(ruleData);
      res.status(201).json(rule);
    } catch (error) {
      res.status(400).json({ message: "Invalid rule data" });
    }
  });

  // Update qualification rule
  app.patch("/api/qualification-rules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updated = await storage.updateQualificationRule(parseInt(id), updates);
      
      if (!updated) {
        return res.status(404).json({ message: "Rule not found" });
      }
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update rule" });
    }
  });

  // Delete qualification rule
  app.delete("/api/qualification-rules/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteQualificationRule(parseInt(id));
      
      if (!deleted) {
        return res.status(404).json({ message: "Rule not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete rule" });
    }
  });

  // Google Calendar OAuth
  app.get("/api/auth/google", (req, res) => {
    const authUrl = googleCalendar.getAuthUrl();
    res.json({ authUrl });
  });

  app.post("/api/auth/google/callback", async (req, res) => {
    try {
      const { code } = req.body;
      const tokens = await googleCalendar.getTokensFromCode(code);
      
      // Store integration
      await storage.createIntegration({
        userId: MOCK_USER_ID,
        type: 'google_calendar',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        settings: {},
        isActive: true,
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to authenticate with Google Calendar" });
    }
  });

  // Sync calendar events
  app.post("/api/sync/calendar", async (req, res) => {
    try {
      const integration = await storage.getIntegration(MOCK_USER_ID, 'google_calendar');
      
      if (!integration || !integration.accessToken) {
        return res.status(400).json({ message: "Google Calendar not connected" });
      }
      
      const events = await googleCalendar.getEvents(integration.accessToken);
      
      // Process and store events
      for (const event of events) {
        const existingMeeting = await storage.getMeetingByExternalId(MOCK_USER_ID, event.id);
        
        if (!existingMeeting) {
          const meetingData = {
            userId: MOCK_USER_ID,
            externalId: event.id,
            title: event.summary || '',
            description: event.description || '',
            startTime: new Date(event.start.dateTime || event.start.date),
            endTime: new Date(event.end.dateTime || event.end.date),
            attendeeEmail: event.attendees?.[0]?.email || '',
            status: 'pending' as const,
          };
          
          const meeting = await storage.createMeeting(meetingData);
          
          // Run qualification
          await qualificationEngine.qualifyMeeting(meeting.id);
        }
      }
      
      res.json({ success: true, synced: events.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to sync calendar" });
    }
  });

  // Calendly webhook
  app.post("/api/webhooks/calendly", async (req, res) => {
    try {
      const { event, payload } = req.body;
      
      if (event === 'invitee.created') {
        // Extract form data and create meeting
        const formData = payload.questions_and_answers || [];
        const meetingData = calendly.extractMeetingData(payload, formData);
        
        const meeting = await storage.createMeeting({
          ...meetingData,
          userId: MOCK_USER_ID,
        });
        
        // Run qualification
        await qualificationEngine.qualifyMeeting(meeting.id);
      }
      
      res.status(200).json({ received: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // Manual qualification
  app.post("/api/meetings/:id/qualify", async (req, res) => {
    try {
      const { id } = req.params;
      await qualificationEngine.qualifyMeeting(parseInt(id));
      
      const updated = await storage.updateMeeting(parseInt(id), {
        lastProcessed: new Date(),
      });
      
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to qualify meeting" });
    }
  });

  // Gmail OAuth
  app.get("/api/auth/gmail", (req, res) => {
    const authUrl = gmailService.getAuthUrl();
    res.json({ authUrl });
  });

  app.post("/api/auth/gmail/callback", async (req, res) => {
    try {
      const { code } = req.body;
      const tokens = await gmailService.getTokensFromCode(code);
      
      // Store integration
      await storage.createIntegration({
        userId: MOCK_USER_ID,
        type: 'gmail',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        settings: {},
        isActive: true,
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ message: "Failed to authenticate with Gmail" });
    }
  });

  // Send confirmation email to qualified meetings
  app.post("/api/meetings/:id/send-confirmation", async (req, res) => {
    try {
      const { id } = req.params;
      const meetings = await storage.getUserMeetings(MOCK_USER_ID, 1000);
      const meeting = meetings.find(m => m.id === parseInt(id));
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      if (meeting.status !== 'qualified') {
        return res.status(400).json({ message: "Can only send confirmations to qualified meetings" });
      }

      const gmailIntegration = await storage.getIntegration(MOCK_USER_ID, 'gmail');
      
      if (!gmailIntegration || !gmailIntegration.accessToken) {
        return res.status(400).json({ message: "Gmail not connected" });
      }

      // Send confirmation email
      await gmailService.sendConfirmationEmail(gmailIntegration.accessToken, meeting);

      // Create email job record
      await storage.createEmailJob({
        userId: MOCK_USER_ID,
        meetingId: meeting.id,
        type: 'confirmation',
        status: 'sent',
        scheduledAt: new Date(),
        sentAt: new Date(),
        retryCount: 0,
      });

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to send confirmation email" });
    }
  });

  // Get email jobs for a user
  app.get("/api/email-jobs", async (req, res) => {
    try {
      const jobs = await storage.getUserEmailJobs(MOCK_USER_ID);
      res.json(jobs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch email jobs" });
    }
  });

  // Free calendar slot for disqualified meeting
  app.post("/api/meetings/:id/free-calendar-slot", async (req, res) => {
    try {
      const { id } = req.params;
      const meetings = await storage.getUserMeetings(MOCK_USER_ID, 1000);
      const meeting = meetings.find(m => m.id === parseInt(id));
      
      if (!meeting) {
        return res.status(404).json({ message: "Meeting not found" });
      }

      if (!meeting.externalId) {
        return res.status(400).json({ message: "Meeting has no external calendar ID" });
      }

      const googleCalendarIntegration = await storage.getIntegration(MOCK_USER_ID, 'google_calendar');
      
      if (!googleCalendarIntegration || !googleCalendarIntegration.accessToken) {
        return res.status(400).json({ message: "Google Calendar not connected" });
      }

      let eventId = meeting.externalId;
      
      // Skip Calendly events as they manage their own calendar
      if (eventId.startsWith('calendly_')) {
        return res.status(400).json({ message: "Cannot free Calendly managed events" });
      }

      // Remove prefix for Google Calendar events
      if (eventId.startsWith('gcal_')) {
        eventId = eventId.replace('gcal_', '');
      }
      
      await googleCalendar.markEventAsFree(googleCalendarIntegration.accessToken, eventId);
      
      // Update meeting status to disqualified if not already
      if (meeting.status !== 'disqualified') {
        await storage.updateMeeting(parseInt(id), {
          status: 'disqualified',
          qualificationReason: 'Calendar slot freed manually',
          lastProcessed: new Date(),
        });
      }

      res.json({ 
        success: true, 
        message: `Calendar slot freed for meeting: ${meeting.title}`,
        eventId: eventId
      });
    } catch (error) {
      console.error('Failed to free calendar slot:', error);
      res.status(500).json({ message: "Failed to free calendar slot" });
    }
  });

  // Send daily report
  app.post("/api/reports/daily", async (req, res) => {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const stats = await storage.getMeetingStats(MOCK_USER_ID, yesterday, today);
      const meetings = await storage.getUserMeetings(MOCK_USER_ID, 50);
      
      const user = await storage.getUser(MOCK_USER_ID);
      if (user?.email) {
        await emailService.sendDailyReport(user.email, stats, meetings);
      }
      
      // Store report record
      await storage.createEmailReport({
        userId: MOCK_USER_ID,
        reportDate: today,
        totalMeetings: stats.total,
        qualifiedMeetings: stats.qualified,
        disqualifiedMeetings: stats.disqualified,
        needsReviewMeetings: stats.needsReview,
        sentAt: new Date(),
      });
      
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to send daily report" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
