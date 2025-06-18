import { storage } from "../storage";
import { EmailService } from "./email-service";
import { GmailService } from "./gmail-service";

export class NoShowRescheduleService {
  private emailService: EmailService;
  private gmailService: GmailService;
  private isProcessing: boolean = false;

  constructor() {
    this.emailService = new EmailService();
    this.gmailService = new GmailService();
  }

  async startScheduler() {
    console.log("No-show reschedule service started");
    
    // Check for no-shows every 30 minutes
    setInterval(async () => {
      if (!this.isProcessing) {
        await this.processNoShows();
      }
    }, 30 * 60 * 1000);

    // Initial check after 5 minutes
    setTimeout(async () => {
      await this.processNoShows();
    }, 5 * 60 * 1000);
  }

  private async processNoShows() {
    this.isProcessing = true;
    console.log("Processing no-show reschedule emails...");

    try {
      // Get all users to check their settings and no-show meetings
      const users = await this.getAllUsersWithNoShows();
      
      for (const user of users) {
        await this.processUserNoShows(user.id);
      }
    } catch (error) {
      console.error("Error processing no-show reschedules:", error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async getAllUsersWithNoShows(): Promise<Array<{id: string, email: string}>> {
    // This would need to be implemented in storage to get users with recent no-shows
    // For now, we'll work with the current user approach
    return [];
  }

  private async processUserNoShows(userId: string) {
    try {
      const userSettings = await storage.getUserSettings(userId);
      const noShowRescheduleEnabled = userSettings?.noShowRescheduleEnabled ?? false;
      
      if (!noShowRescheduleEnabled) {
        return; // User has disabled no-show reschedule emails
      }

      // Get meetings marked as no-show in the last 24 hours that haven't had reschedule emails sent
      const meetings = await storage.getUserMeetings(userId, 1000);
      const recentNoShows = meetings.filter(meeting => {
        if (meeting.status !== 'no_show' || meeting.rescheduleEmailSent) {
          return false;
        }

        if (!meeting.noShowMarkedAt) {
          return false;
        }

        // Only send reschedule emails for qualified meetings
        if (meeting.qualificationResult) {
          const qualResult = typeof meeting.qualificationResult === 'string' 
            ? JSON.parse(meeting.qualificationResult) 
            : meeting.qualificationResult;
          
          if (qualResult.finalStatus !== 'qualified') {
            return false;
          }
        }

        // Check if no-show was marked within the last 24 hours
        const hoursAgo = Date.now() - meeting.noShowMarkedAt.getTime();
        const hoursThreshold = userSettings?.noShowRescheduleDelayHours ?? 2; // Default 2 hours delay
        const maxHours = 24; // Don't send after 24 hours

        return hoursAgo >= (hoursThreshold * 60 * 60 * 1000) && hoursAgo <= (maxHours * 60 * 60 * 1000);
      });

      for (const meeting of recentNoShows) {
        await this.sendRescheduleEmail(userId, meeting);
      }
    } catch (error) {
      console.error(`Error processing no-shows for user ${userId}:`, error);
    }
  }

  private async sendRescheduleEmail(userId: string, meeting: any) {
    try {
      // Get user's Gmail integration
      const gmailIntegration = await storage.getIntegration(userId, 'gmail');
      
      if (!gmailIntegration || !gmailIntegration.accessToken) {
        console.log(`No Gmail integration for user ${userId}, skipping reschedule email`);
        return;
      }

      // Get user settings for reschedule email template
      const userSettings = await storage.getUserSettings(userId);
      const emailTemplate = await this.getRescheduleEmailTemplate(userId, userSettings);
      
      // Generate personalized email content
      const emailContent = this.generateRescheduleEmailContent(meeting, emailTemplate, userSettings);
      
      // Send the email via Gmail
      await this.gmailService.sendRescheduleEmail(
        gmailIntegration.accessToken,
        meeting.attendeeEmail,
        emailContent.subject,
        emailContent.html,
        emailContent.text
      );

      // Mark the meeting as having received a reschedule email
      await storage.updateMeeting(meeting.id, {
        rescheduleEmailSent: true,
        lastProcessed: new Date()
      });

      // Create email job record
      await storage.createEmailJob({
        userId,
        meetingId: meeting.id,
        jobType: 'no_show_reschedule',
        status: 'sent',
        scheduledAt: new Date(),
        emailContent: emailContent.html,
        recipientEmail: meeting.attendeeEmail,
        subject: emailContent.subject
      });

      console.log(`Reschedule email sent to ${meeting.attendeeEmail} for meeting: ${meeting.title}`);
    } catch (error) {
      console.error(`Failed to send reschedule email for meeting ${meeting.id}:`, error);
      
      // Create failed email job record
      await storage.createEmailJob({
        userId,
        meetingId: meeting.id,
        jobType: 'no_show_reschedule',
        status: 'failed',
        scheduledAt: new Date(),
        emailContent: `Failed to send reschedule email`,
        recipientEmail: meeting.attendeeEmail,
        subject: 'Reschedule Email Failed',
        errorMessage: error.message
      });
    }
  }

  private async getRescheduleEmailTemplate(userId: string, userSettings: any) {
    // Try to get user's custom reschedule template
    const templates = await storage.getUserEmailTemplates(userId);
    const rescheduleTemplate = templates.find(t => t.templateType === 'no_show_reschedule' && t.isActive);
    
    if (rescheduleTemplate) {
      return rescheduleTemplate;
    }

    // Return default template
    return {
      subject: "Let's reschedule our meeting - {{attendeeName}}",
      content: `Hi {{attendeeName}},

I noticed we missed our scheduled meeting "{{meetingTitle}}" on {{meetingDate}}. No worries - these things happen!

I'd love to reschedule and continue our conversation. Here are a few time slots that work for me:

{{availabilitySlots}}

Or if none of these work, feel free to book a time that's convenient for you here: {{calendlyLink}}

Looking forward to connecting soon!

Best regards,
{{senderName}}`,
      variables: {
        attendeeName: "meeting.attendeeName || 'there'",
        meetingTitle: "meeting.title",
        meetingDate: "meeting.startTime",
        availabilitySlots: "userSettings?.rescheduleAvailabilitySlots || 'Please let me know what works for you'",
        calendlyLink: "userSettings?.calendlyRescheduleLink || userSettings?.calendlyLink || '#'",
        senderName: "userSettings?.senderName || 'The Team'"
      }
    };
  }

  private generateRescheduleEmailContent(meeting: any, template: any, userSettings: any) {
    const variables = {
      attendeeName: meeting.attendeeName || 'there',
      meetingTitle: meeting.title || 'our meeting',
      meetingDate: meeting.startTime ? new Date(meeting.startTime).toLocaleDateString() : 'recently',
      availabilitySlots: userSettings?.rescheduleAvailabilitySlots || `• Tomorrow at 2:00 PM
• Day after tomorrow at 10:00 AM  
• Next week Tuesday at 3:00 PM`,
      calendlyLink: userSettings?.calendlyRescheduleLink || userSettings?.calendlyLink || '#',
      senderName: userSettings?.senderName || 'The Team'
    };

    let subject = template.subject;
    let content = template.content;

    // Replace variables in subject and content
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      content = content.replace(new RegExp(placeholder, 'g'), value);
    });

    // Convert to HTML (simple line breaks to <br>)
    const html = content.replace(/\n/g, '<br>');

    return {
      subject,
      html,
      text: content
    };
  }

  // Manual trigger for sending reschedule email
  async sendManualRescheduleEmail(userId: string, meetingId: number) {
    const meetings = await storage.getUserMeetings(userId, 1000);
    const meeting = meetings.find(m => m.id === meetingId);
    
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    if (meeting.status !== 'no_show') {
      throw new Error('Meeting is not marked as no-show');
    }

    await this.sendRescheduleEmail(userId, meeting);
  }
}

export const noShowRescheduleService = new NoShowRescheduleService();