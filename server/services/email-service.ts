import type { Meeting } from "@shared/schema";

export class EmailService {
  private smtpConfig: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };

  constructor() {
    this.smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    };
  }

  async sendDailyReport(
    email: string, 
    stats: { total: number; qualified: number; disqualified: number; needsReview: number },
    meetings: Meeting[]
  ): Promise<void> {
    const today = new Date().toLocaleDateString();
    
    const htmlContent = this.generateDailyReportHTML(stats, meetings, today);
    
    // In a real implementation, you would use nodemailer or similar
    // For now, we'll just log the email content
    console.log(`Daily Report Email for ${email}:`);
    console.log(`Subject: Sales Meeting Report - ${today}`);
    console.log(`Stats: ${JSON.stringify(stats)}`);
    console.log(`Meetings processed: ${meetings.length}`);
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private generateDailyReportHTML(
    stats: { total: number; qualified: number; disqualified: number; needsReview: number },
    meetings: Meeting[],
    date: string
  ): string {
    const recentMeetings = meetings
      .filter(m => new Date(m.startTime) >= new Date(Date.now() - 24 * 60 * 60 * 1000))
      .slice(0, 10);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .header { background: #2563EB; color: white; padding: 20px; text-align: center; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat-box { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
            .meeting { border-left: 4px solid #ddd; padding: 10px; margin: 10px 0; }
            .qualified { border-left-color: #22c55e; }
            .disqualified { border-left-color: #ef4444; }
            .needs-review { border-left-color: #f59e0b; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Daily Sales Meeting Report</h1>
            <p>${date}</p>
          </div>
          
          <div class="stats">
            <div class="stat-box">
              <h3>${stats.total}</h3>
              <p>Total Meetings</p>
            </div>
            <div class="stat-box">
              <h3>${stats.qualified}</h3>
              <p>Qualified</p>
            </div>
            <div class="stat-box">
              <h3>${stats.disqualified}</h3>
              <p>Disqualified</p>
            </div>
            <div class="stat-box">
              <h3>${stats.needsReview}</h3>
              <p>Need Review</p>
            </div>
          </div>

          <h2>Recent Meetings</h2>
          ${recentMeetings.map(meeting => `
            <div class="meeting ${meeting.status}">
              <h4>${meeting.title}</h4>
              <p><strong>Time:</strong> ${new Date(meeting.startTime).toLocaleString()}</p>
              <p><strong>Attendee:</strong> ${meeting.attendeeName} (${meeting.attendeeEmail})</p>
              <p><strong>Status:</strong> ${meeting.status.toUpperCase()}</p>
              ${meeting.qualificationReason ? `<p><strong>Reason:</strong> ${meeting.qualificationReason}</p>` : ''}
            </div>
          `).join('')}
        </body>
      </html>
    `;
  }
}
