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

  async sendPreMeetingSummary(
    email: string,
    summary: any,
    meeting: Meeting
  ): Promise<void> {
    const startTime = new Date(meeting.startTime);
    const subject = `🎯 Pre-Meeting Summary: ${meeting.attendeeName || 'Prospect'} (${startTime.toLocaleTimeString()})`;
    
    console.log(`Pre-Meeting Summary Email for ${email}:`);
    console.log(`Subject: ${subject}`);
    console.log(`Meeting: ${meeting.title}`);
    console.log(`Prospect: ${summary.name} from ${summary.company}`);
    console.log(`Pain Points: ${summary.painPoints.join(', ')}`);
    console.log(`Likely Objections: ${summary.likelyObjections.join(', ')}`);
    
    // Simulate email sending
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private generateMorningBriefingHTML(
    meetings: any[],
    summaries: any[]
  ): string {
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    const meetingCards = meetings.map((meeting, index) => {
      const summary = summaries[index];
      const startTime = new Date(meeting.startTime);
      const timeString = startTime.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        timeZoneName: 'short'
      });

      return `
        <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 20px; background: white;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3 style="margin: 0; color: #1f2937; font-size: 18px;">${timeString} - ${summary.name}</h3>
            <span style="background: ${meeting.status === 'qualified' ? '#10b981' : '#f59e0b'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">
              ${meeting.status === 'qualified' ? 'Qualified' : 'Needs Review'}
            </span>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 15px;">
            <div>
              <strong style="color: #374151;">Company:</strong> ${summary.company}<br>
              <strong style="color: #374151;">Industry:</strong> ${summary.industry}<br>
              <strong style="color: #374151;">Revenue:</strong> ${summary.revenue}
            </div>
            <div>
              <strong style="color: #374151;">Contact:</strong><br>
              <span style="font-size: 14px; color: #6b7280;">
                Email: ${summary.email || 'Not provided'}<br>
                Phone: ${summary.phone || 'Not provided'}
              </span>
            </div>
          </div>

          ${summary.painPoints && summary.painPoints.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <strong style="color: #dc2626;">Key Pain Points:</strong>
            <ul style="margin: 5px 0; padding-left: 20px; color: #374151;">
              ${summary.painPoints.map((point: string) => `<li>${point}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          ${summary.likelyObjections && summary.likelyObjections.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <strong style="color: #d97706;">Likely Objections:</strong>
            <ul style="margin: 5px 0; padding-left: 20px; color: #374151;">
              ${summary.likelyObjections.map((objection: string) => `<li>${objection}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          ${summary.currentSolutions && summary.currentSolutions.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <strong style="color: #7c3aed;">Current Solutions:</strong>
            <ul style="margin: 5px 0; padding-left: 20px; color: #374151;">
              ${summary.currentSolutions.map((solution: string) => `<li>${solution}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
        </div>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Morning Briefing - ${today}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 28px; font-weight: 600;">Good Morning!</h1>
    <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Your briefing for ${today}</p>
    <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 8px; margin-top: 20px;">
      <div style="font-size: 24px; font-weight: bold;">${meetings.length}</div>
      <div style="font-size: 14px; opacity: 0.8;">meeting${meetings.length !== 1 ? 's' : ''} scheduled today</div>
    </div>
  </div>

  <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05); margin-bottom: 20px;">
    <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 20px;">Today's Meeting Schedule</h2>
    ${meetingCards}
  </div>

  <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; border-left: 4px solid #3b82f6;">
    <h3 style="margin: 0 0 10px 0; color: #1f2937;">Quick Prep Tips</h3>
    <ul style="margin: 0; padding-left: 20px; color: #4b5563;">
      <li>Review each prospect's pain points before the call</li>
      <li>Prepare responses to likely objections</li>
      <li>Research their current solutions for better positioning</li>
      <li>Have relevant case studies ready for their industry</li>
    </ul>
  </div>

  <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
    <p style="margin: 0; color: #6b7280; font-size: 14px;">
      This briefing was automatically generated by your Calendar Grooming Agent
    </p>
  </div>

</body>
</html>
    `;
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
