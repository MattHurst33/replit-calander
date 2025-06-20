import { storage } from "../storage";
import { eq, and, isNotNull, gte, lte } from "drizzle-orm";
import { meetings } from "@shared/schema";
import { db } from "../db";

export interface RescheduleAttempt {
  meetingId: number;
  attemptNumber: number;
  scheduledTime: Date;
  emailSent: boolean;
  success: boolean;
  reason?: string;
}

export class AutoRescheduleService {
  private isProcessing: boolean = false;
  private maxRescheduleAttempts = 2; // Maximum automatic reschedule attempts
  private rescheduleDelayHours = 2; // Wait 2 hours after no-show before attempting reschedule

  constructor() {}

  async startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    console.log("Auto-reschedule service started");
    
    // Check for meetings to reschedule every 30 minutes
    setInterval(async () => {
      try {
        await this.processAutoReschedules();
      } catch (error) {
        console.error("Error processing auto-reschedules:", error);
      }
    }, 30 * 60 * 1000);

    // Initial check
    await this.processAutoReschedules();
  }

  private async processAutoReschedules() {
    console.log("Processing auto-reschedules...");
    
    try {
      // Find meetings that are marked as no-show and eligible for auto-reschedule
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - this.rescheduleDelayHours);
      
      const noShowMeetings = await db
        .select()
        .from(meetings)
        .where(
          and(
            eq(meetings.status, 'no_show'),
            lte(meetings.noShowMarkedAt, cutoffTime),
            // Only meetings with fewer than max attempts
            lte(meetings.autoRescheduleAttempts, this.maxRescheduleAttempts - 1)
          )
        );

      for (const meeting of noShowMeetings) {
        await this.attemptReschedule(meeting);
      }
      
      console.log(`Auto-reschedule processing completed for ${noShowMeetings.length} meetings`);
    } catch (error) {
      console.error("Error in auto-reschedule process:", error);
    }
  }

  private async attemptReschedule(meeting: any): Promise<RescheduleAttempt> {
    const attemptNumber = (meeting.autoRescheduleAttempts || 0) + 1;
    
    try {
      // Check user's auto-reschedule settings
      const userSettings = await storage.getUserSettings(meeting.userId);
      
      if (!userSettings?.autoRescheduleEnabled) {
        return {
          meetingId: meeting.id,
          attemptNumber,
          scheduledTime: new Date(),
          emailSent: false,
          success: false,
          reason: 'Auto-reschedule disabled for user'
        };
      }

      // Calculate next available time slot
      const nextAvailableTime = await this.findNextAvailableSlot(
        meeting.userId, 
        new Date(meeting.startTime),
        userSettings
      );

      if (!nextAvailableTime) {
        return {
          meetingId: meeting.id,
          attemptNumber,
          scheduledTime: new Date(),
          emailSent: false,
          success: false,
          reason: 'No available time slots found'
        };
      }

      // Create reschedule email content
      const emailContent = await this.generateRescheduleEmail(meeting, nextAvailableTime, attemptNumber);
      
      // Send reschedule email
      const emailSent = await this.sendRescheduleEmail(meeting, emailContent);
      
      // Update meeting with reschedule attempt
      await this.updateMeetingRescheduleAttempt(meeting.id, {
        attemptNumber,
        scheduledTime: nextAvailableTime,
        emailSent,
        originalTime: meeting.startTime
      });

      return {
        meetingId: meeting.id,
        attemptNumber,
        scheduledTime: nextAvailableTime,
        emailSent,
        success: true
      };

    } catch (error) {
      console.error(`Error attempting reschedule for meeting ${meeting.id}:`, error);
      
      await this.updateMeetingRescheduleAttempt(meeting.id, {
        attemptNumber,
        scheduledTime: new Date(),
        emailSent: false,
        originalTime: meeting.startTime
      });

      return {
        meetingId: meeting.id,
        attemptNumber,
        scheduledTime: new Date(),
        emailSent: false,
        success: false,
        reason: error.message
      };
    }
  }

  private async findNextAvailableSlot(
    userId: string, 
    originalTime: Date,
    userSettings: any
  ): Promise<Date | null> {
    // Get user's business hours and availability preferences
    const businessHours = userSettings?.businessHours || {
      start: '09:00',
      end: '17:00',
      timezone: 'UTC'
    };
    
    const rescheduleDaysOut = userSettings?.rescheduleDaysOut || 7; // Default to next 7 days
    
    // Get user's existing meetings to avoid conflicts
    const existingMeetings = await storage.getUserMeetings(userId);
    
    // Start looking from the next business day
    const searchStart = new Date(originalTime);
    searchStart.setDate(searchStart.getDate() + 1);
    
    for (let dayOffset = 0; dayOffset < rescheduleDaysOut; dayOffset++) {
      const checkDate = new Date(searchStart);
      checkDate.setDate(checkDate.getDate() + dayOffset);
      
      // Skip weekends unless user allows them
      if (!userSettings?.includeWeekends && (checkDate.getDay() === 0 || checkDate.getDay() === 6)) {
        continue;
      }
      
      // Check each hour slot during business hours
      const [startHour] = businessHours.start.split(':').map(Number);
      const [endHour] = businessHours.end.split(':').map(Number);
      
      for (let hour = startHour; hour < endHour; hour++) {
        const slotTime = new Date(checkDate);
        slotTime.setHours(hour, 0, 0, 0);
        
        // Check if this slot conflicts with existing meetings
        const hasConflict = existingMeetings.some(existing => {
          const existingStart = new Date(existing.startTime);
          const existingEnd = new Date(existing.endTime);
          const slotEnd = new Date(slotTime);
          slotEnd.setHours(slotEnd.getHours() + 1); // Assume 1-hour meetings
          
          return (slotTime >= existingStart && slotTime < existingEnd) ||
                 (slotEnd > existingStart && slotEnd <= existingEnd);
        });
        
        if (!hasConflict) {
          return slotTime;
        }
      }
    }
    
    return null; // No available slots found
  }

  private async generateRescheduleEmail(
    meeting: any, 
    newTime: Date, 
    attemptNumber: number
  ): Promise<{ subject: string; html: string; text: string }> {
    const isFirstAttempt = attemptNumber === 1;
    const formatTime = (date: Date) => date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    const subject = isFirstAttempt 
      ? `Let's reschedule our meeting - ${meeting.title}`
      : `Second attempt: Rescheduling our meeting - ${meeting.title}`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Meeting Reschedule Request</h2>
        
        <p>Hi ${meeting.attendeeName},</p>
        
        <p>${isFirstAttempt 
          ? "I noticed we missed our scheduled meeting earlier. No worries - these things happen!" 
          : "I wanted to follow up on rescheduling our meeting."
        }</p>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #495057;">Original Meeting:</h3>
          <p><strong>${meeting.title}</strong></p>
          <p>Originally scheduled: ${formatTime(new Date(meeting.startTime))}</p>
          
          <h3 style="color: #495057;">Proposed New Time:</h3>
          <p style="color: #007bff; font-weight: bold;">${formatTime(newTime)}</p>
        </div>
        
        <p>I've found this available time slot that should work well. Please let me know if this works for you, or suggest an alternative time that's more convenient.</p>
        
        <div style="margin: 30px 0;">
          <a href="mailto:${meeting.organizerEmail}?subject=Re: ${subject}" 
             style="background: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Confirm New Time
          </a>
        </div>
        
        <p>Looking forward to connecting with you!</p>
        
        <p>Best regards,<br>
        Your Sales Team</p>
        
        ${attemptNumber >= 2 ? 
          '<p style="color: #6c757d; font-size: 12px;"><em>This is our final automatic reschedule attempt. Please reply to confirm or suggest an alternative time.</em></p>' 
          : ''
        }
      </div>
    `;

    const text = `
Hi ${meeting.attendeeName},

${isFirstAttempt 
  ? "I noticed we missed our scheduled meeting earlier. No worries - these things happen!" 
  : "I wanted to follow up on rescheduling our meeting."
}

Original Meeting: ${meeting.title}
Originally scheduled: ${formatTime(new Date(meeting.startTime))}

Proposed New Time: ${formatTime(newTime)}

I've found this available time slot that should work well. Please let me know if this works for you, or suggest an alternative time that's more convenient.

Looking forward to connecting with you!

Best regards,
Your Sales Team

${attemptNumber >= 2 ? 
  'This is our final automatic reschedule attempt. Please reply to confirm or suggest an alternative time.' 
  : ''
}
    `;

    return { subject, html, text };
  }

  private async sendRescheduleEmail(meeting: any, emailContent: any): Promise<boolean> {
    try {
      // In a real implementation, this would use the email service
      // For now, we'll simulate email sending
      console.log(`Sending reschedule email for meeting ${meeting.id}:`, {
        to: meeting.attendeeEmail,
        subject: emailContent.subject,
        body: emailContent.text.substring(0, 100) + '...'
      });
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true; // Assume success for demo
    } catch (error) {
      console.error(`Failed to send reschedule email for meeting ${meeting.id}:`, error);
      return false;
    }
  }

  private async updateMeetingRescheduleAttempt(
    meetingId: number, 
    attemptData: {
      attemptNumber: number;
      scheduledTime: Date;
      emailSent: boolean;
      originalTime: Date;
    }
  ) {
    try {
      await db
        .update(meetings)
        .set({
          autoRescheduleAttempts: attemptData.attemptNumber,
          lastRescheduleAttempt: new Date(),
          rescheduleEmailSent: attemptData.emailSent,
          originalMeetingTime: attemptData.originalTime,
          // Update meeting time to new scheduled time if email was sent successfully
          ...(attemptData.emailSent && {
            startTime: attemptData.scheduledTime,
            endTime: new Date(attemptData.scheduledTime.getTime() + 60 * 60 * 1000), // Add 1 hour
            status: 'pending' // Reset status to pending
          }),
          updatedAt: new Date()
        })
        .where(eq(meetings.id, meetingId));
        
    } catch (error) {
      console.error(`Error updating reschedule attempt for meeting ${meetingId}:`, error);
    }
  }

  // Manual trigger for specific meeting
  async triggerRescheduleForMeeting(meetingId: number): Promise<RescheduleAttempt> {
    try {
      const meeting = await db
        .select()
        .from(meetings)
        .where(eq(meetings.id, meetingId))
        .limit(1);

      if (!meeting.length) {
        throw new Error('Meeting not found');
      }

      return await this.attemptReschedule(meeting[0]);
    } catch (error) {
      console.error(`Error triggering reschedule for meeting ${meetingId}:`, error);
      throw error;
    }
  }

  // Get reschedule statistics for a user
  async getRescheduleStats(userId: string): Promise<{
    totalAttempts: number;
    successfulReschedules: number;
    failedAttempts: number;
    meetingsWithReschedules: number;
    averageAttemptsPerMeeting: number;
  }> {
    try {
      const userMeetings = await storage.getUserMeetings(userId);
      
      const meetingsWithReschedules = userMeetings.filter(m => m.autoRescheduleAttempts > 0);
      const totalAttempts = meetingsWithReschedules.reduce((sum, m) => sum + (m.autoRescheduleAttempts || 0), 0);
      const successfulReschedules = meetingsWithReschedules.filter(m => m.rescheduleEmailSent).length;
      
      return {
        totalAttempts,
        successfulReschedules,
        failedAttempts: totalAttempts - successfulReschedules,
        meetingsWithReschedules: meetingsWithReschedules.length,
        averageAttemptsPerMeeting: meetingsWithReschedules.length > 0 
          ? totalAttempts / meetingsWithReschedules.length 
          : 0
      };
    } catch (error) {
      console.error(`Error getting reschedule stats for user ${userId}:`, error);
      throw error;
    }
  }
}

export const autoRescheduleService = new AutoRescheduleService();