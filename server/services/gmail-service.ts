import type { Meeting } from "@shared/schema";

export class GmailService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private refreshToken: string;

  constructor() {
    this.clientId = process.env.GMAIL_CLIENT_ID || '';
    this.clientSecret = process.env.GMAIL_CLIENT_SECRET || '';
    this.redirectUri = process.env.GMAIL_REDIRECT_URI || 'http://localhost:5000/auth/gmail/callback';
    this.refreshToken = process.env.GMAIL_REFRESH_TOKEN || '';
  }

  getAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose'
    ];
    
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  async getTokensFromCode(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for tokens');
    }

    return await response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<{
    access_token: string;
    expires_in: number;
  }> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    return await response.json();
  }

  async sendConfirmationEmail(accessToken: string, meeting: Meeting): Promise<void> {
    const emailContent = this.generateConfirmationEmail(meeting);
    const rawEmail = this.createRawEmail(
      meeting.attendeeEmail || '',
      'Meeting Confirmation - Looking Forward to Our Discussion',
      emailContent
    );

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: rawEmail
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send confirmation email');
    }
  }

  async sendReminder24Hours(accessToken: string, meeting: Meeting): Promise<void> {
    const emailContent = this.generateReminderEmail(meeting);
    const rawEmail = this.createRawEmail(
      meeting.attendeeEmail || '',
      'Meeting Reminder - Tomorrow\'s Discussion',
      emailContent
    );

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: rawEmail
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send reminder email');
    }
  }

  async sendFollowUpEmail(accessToken: string, meeting: Meeting): Promise<void> {
    const emailContent = this.generateFollowUpEmail(meeting);
    const rawEmail = this.createRawEmail(
      meeting.attendeeEmail || '',
      'Thank You - Next Steps Following Our Meeting',
      emailContent
    );

    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: rawEmail
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to send follow-up email');
    }
  }

  private generateConfirmationEmail(meeting: Meeting): string {
    const meetingDate = new Date(meeting.startTime).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const meetingTime = new Date(meeting.startTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const duration = Math.round((new Date(meeting.endTime).getTime() - new Date(meeting.startTime).getTime()) / (1000 * 60));

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: #2563EB; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f8f9fa; }
            .meeting-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e; }
            .footer { background: #6b7280; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
            .cta-button { background: #2563EB; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Meeting Confirmation</h1>
            <p>We're looking forward to our discussion</p>
          </div>
          
          <div class="content">
            <p>Hi ${meeting.attendeeName || 'there'},</p>
            
            <p>Thank you for scheduling time with us! This email confirms your upcoming meeting.</p>
            
            <div class="meeting-details">
              <h3>${meeting.title}</h3>
              <p><strong>Date:</strong> ${meetingDate}</p>
              <p><strong>Time:</strong> ${meetingTime}</p>
              <p><strong>Duration:</strong> ${duration} minutes</p>
              ${meeting.company ? `<p><strong>Company:</strong> ${meeting.company}</p>` : ''}
              ${meeting.description ? `<p><strong>Agenda:</strong> ${meeting.description}</p>` : ''}
            </div>

            <p>We've identified your meeting as a qualified opportunity based on your company profile and requirements. Our team is excited to discuss how we can help achieve your goals.</p>

            <p><strong>What to prepare:</strong></p>
            <ul>
              <li>Current challenges you're facing</li>
              <li>Goals and objectives for this quarter</li>
              <li>Any specific questions about our solution</li>
            </ul>

            <a href="#" class="cta-button">Add to Calendar</a>

            <p>If you need to reschedule or have any questions, please don't hesitate to reach out.</p>
            
            <p>Best regards,<br>
            The Sales Team</p>
          </div>
          
          <div class="footer">
            <p>This meeting was automatically qualified based on your company profile. We're committed to making this a valuable use of your time.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateReminderEmail(meeting: Meeting): string {
    const meetingTime = new Date(meeting.startTime).toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f8f9fa; }
            .meeting-reminder { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
            .footer { background: #6b7280; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Meeting Reminder</h1>
            <p>Tomorrow's Discussion</p>
          </div>
          
          <div class="content">
            <p>Hi ${meeting.attendeeName || 'there'},</p>
            
            <p>This is a friendly reminder about our meeting tomorrow:</p>
            
            <div class="meeting-reminder">
              <h3>${meeting.title}</h3>
              <p><strong>When:</strong> ${meetingTime}</p>
              ${meeting.company ? `<p><strong>Company:</strong> ${meeting.company}</p>` : ''}
            </div>

            <p>We're looking forward to our discussion and helping you achieve your business objectives.</p>
            
            <p>See you tomorrow!</p>
            
            <p>Best regards,<br>
            The Sales Team</p>
          </div>
          
          <div class="footer">
            <p>Qualified meeting - we're committed to making this valuable for you.</p>
          </div>
        </body>
      </html>
    `;
  }

  private generateFollowUpEmail(meeting: Meeting): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
            .header { background: #22c55e; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f8f9fa; }
            .next-steps { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e; }
            .footer { background: #6b7280; color: white; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Thank You</h1>
            <p>Following up on our meeting</p>
          </div>
          
          <div class="content">
            <p>Hi ${meeting.attendeeName || 'there'},</p>
            
            <p>Thank you for taking the time to meet with us today. It was great learning more about ${meeting.company} and your goals.</p>
            
            <div class="next-steps">
              <h3>Next Steps</h3>
              <ul>
                <li>We'll prepare a custom proposal based on our discussion</li>
                <li>You'll receive it within 2-3 business days</li>
                <li>We'll schedule a follow-up to review the proposal</li>
              </ul>
            </div>

            <p>In the meantime, if you have any questions or need additional information, please don't hesitate to reach out.</p>
            
            <p>Looking forward to continuing our partnership discussion!</p>
            
            <p>Best regards,<br>
            The Sales Team</p>
          </div>
          
          <div class="footer">
            <p>This was a qualified opportunity. We appreciate your time and interest.</p>
          </div>
        </body>
      </html>
    `;
  }

  private createRawEmail(to: string, subject: string, htmlContent: string): string {
    const emailLines = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlContent
    ];
    
    const email = emailLines.join('\n');
    return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
}