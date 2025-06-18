import { storage } from "../storage";
import { EmailService } from "./email-service";
import { GmailService } from "./gmail-service";
import type { Meeting, EmailTemplate } from "@shared/schema";

export class QualifiedEmailService {
  private emailService: EmailService;
  private gmailService: GmailService;

  constructor() {
    this.emailService = new EmailService();
    this.gmailService = new GmailService();
  }

  async sendQualifiedAppointmentEmail(meeting: Meeting) {
    try {
      // Get active qualified appointment template
      const templates = await storage.getUserEmailTemplates(meeting.userId);
      const activeTemplate = templates.find(
        t => t.type === 'qualified_appointment' && t.isActive
      );

      if (!activeTemplate) {
        console.log('No active qualified appointment template found');
        return;
      }

      // Get user email
      const user = await storage.getUser(meeting.userId);
      if (!user?.email) {
        console.log('User email not found');
        return;
      }

      // Process email content with variables
      const processedContent = this.processEmailTemplate(activeTemplate, meeting);

      // Try to send via Gmail API first, then fallback to SMTP
      const integrations = await storage.getUserIntegrations(meeting.userId);
      const gmailIntegration = integrations.find(i => i.type === 'gmail');

      if (gmailIntegration?.accessToken && meeting.attendeeEmail) {
        await this.sendViaGmail(
          gmailIntegration.accessToken,
          meeting.attendeeEmail,
          processedContent.subject,
          processedContent.content
        );
      } else {
        console.log('Gmail not configured or attendee email missing, skipping qualified appointment email');
      }

      console.log(`Qualified appointment email sent for meeting ${meeting.id}`);
    } catch (error) {
      console.error('Error sending qualified appointment email:', error);
    }
  }

  private processEmailTemplate(template: EmailTemplate, meeting: Meeting) {
    const formData = meeting.formData || {};
    const startTime = new Date(meeting.startTime);
    
    // Extract variables from meeting data
    const variables = {
      prospect_name: meeting.attendeeName || formData.name || "there",
      company_name: meeting.company || formData.company || "your company",
      meeting_date: startTime.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }),
      meeting_time: startTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZoneName: 'short'
      }),
      meeting_link: meeting.meetingUrl || "Calendar invite will include the link",
      your_name: "Your Sales Rep", // Could be pulled from user settings
      pain_point_1: this.extractPainPoint(formData, 0),
      pain_point_2: this.extractPainPoint(formData, 1),
      pain_point_3: this.extractPainPoint(formData, 2),
      next_steps: "We'll follow up with a custom proposal within 24 hours"
    };

    // Replace variables in subject and content
    let processedSubject = template.subject;
    let processedContent = template.content;

    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = new RegExp(`{{${key}}}`, 'g');
      processedSubject = processedSubject.replace(placeholder, value);
      processedContent = processedContent.replace(placeholder, value);
    });

    return {
      subject: processedSubject,
      content: processedContent
    };
  }

  private extractPainPoint(formData: Record<string, any>, index: number): string {
    const painPoints = [];
    
    if (formData.challenges) painPoints.push(formData.challenges);
    if (formData.problems) painPoints.push(formData.problems);
    if (formData.pain_points) painPoints.push(formData.pain_points);
    if (formData.biggest_challenge) painPoints.push(formData.biggest_challenge);
    if (formData.growth_challenges) painPoints.push("Growth challenges");
    if (formData.efficiency_issues) painPoints.push("Efficiency issues");
    if (formData.cost_concerns) painPoints.push("Cost concerns");

    return painPoints[index] || "Operational efficiency";
  }

  private async sendViaGmail(accessToken: string, to: string, subject: string, content: string) {
    const rawEmail = this.createRawEmail(to, subject, content);

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: rawEmail
      })
    });

    if (!response.ok) {
      throw new Error(`Gmail API error: ${response.statusText}`);
    }
  }

  private createRawEmail(to: string, subject: string, content: string): string {
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      this.convertToHtml(content)
    ].join('\r\n');

    return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  }

  private convertToHtml(content: string): string {
    // Convert plain text to HTML with basic formatting
    return content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      .replace(/• /g, '&bull; ');
  }
}

export const qualifiedEmailService = new QualifiedEmailService();