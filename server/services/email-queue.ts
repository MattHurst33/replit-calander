import { storage } from "../storage";
import { GmailService } from "./gmail-service";
import { EmailService } from "./email-service";

export class EmailQueueService {
  private gmailService: GmailService;
  private emailService: EmailService;
  private isProcessing: boolean = false;

  constructor() {
    this.gmailService = new GmailService();
    this.emailService = new EmailService();
  }

  async startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log('Email queue processing started');
    
    // Process emails every 30 seconds
    setInterval(async () => {
      await this.processQueue();
    }, 30000);
  }

  private async processQueue() {
    try {
      const pendingJobs = await storage.getPendingEmailJobs();
      
      for (const job of pendingJobs) {
        await this.processEmailJob(job);
      }
    } catch (error) {
      console.error('Error processing email queue:', error);
    }
  }

  private async processEmailJob(job: any) {
    try {
      const gmailIntegration = await storage.getIntegration(job.userId, 'gmail');
      
      if (!gmailIntegration || !gmailIntegration.accessToken) {
        // Mark job as failed
        await storage.updateEmailJob(job.id, {
          status: 'failed',
          errorMessage: 'Gmail integration not found',
          retryCount: job.retryCount + 1,
        });
        return;
      }

      // Get meeting details
      const meetings = await storage.getUserMeetings(job.userId, 1000);
      const meeting = meetings.find(m => m.id === job.meetingId);
      
      if (!meeting) {
        await storage.updateEmailJob(job.id, {
          status: 'failed',
          errorMessage: 'Meeting not found',
          retryCount: job.retryCount + 1,
        });
        return;
      }

      // Send email based on job type
      switch (job.type) {
        case 'confirmation':
          await this.gmailService.sendConfirmationEmail(gmailIntegration.accessToken, meeting);
          break;
        case 'reminder':
          await this.gmailService.sendReminder24Hours(gmailIntegration.accessToken, meeting);
          break;
        case 'followup':
          await this.gmailService.sendFollowUpEmail(gmailIntegration.accessToken, meeting);
          break;
      }

      // Mark job as completed
      await storage.updateEmailJob(job.id, {
        status: 'sent',
        sentAt: new Date(),
      });

      console.log(`Email ${job.type} sent for meeting ${meeting.title}`);
    } catch (error) {
      console.error('Error processing email job:', error);
      
      // Update job with error and increment retry count
      await storage.updateEmailJob(job.id, {
        status: job.retryCount >= 3 ? 'failed' : 'pending',
        errorMessage: String(error),
        retryCount: job.retryCount + 1,
      });
    }
  }

  async scheduleConfirmationEmail(userId: number, meetingId: number) {
    return await storage.createEmailJob({
      userId,
      meetingId,
      type: 'confirmation',
      status: 'pending',
      scheduledAt: new Date(), // Send immediately
      retryCount: 0,
    });
  }

  async scheduleReminderEmail(userId: number, meetingId: number, meetingDate: Date) {
    const reminderTime = new Date(meetingDate);
    reminderTime.setHours(reminderTime.getHours() - 24); // 24 hours before

    return await storage.createEmailJob({
      userId,
      meetingId,
      type: 'reminder',
      status: 'pending',
      scheduledAt: reminderTime,
      retryCount: 0,
    });
  }

  async scheduleFollowUpEmail(userId: number, meetingId: number, meetingDate: Date) {
    const followUpTime = new Date(meetingDate);
    followUpTime.setHours(followUpTime.getHours() + 2); // 2 hours after

    return await storage.createEmailJob({
      userId,
      meetingId,
      type: 'followup',
      status: 'pending',
      scheduledAt: followUpTime,
      retryCount: 0,
    });
  }
}

export const emailQueue = new EmailQueueService();