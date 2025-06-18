import { storage } from "../storage";
import { EmailService } from "./email-service";
import { GmailService } from "./gmail-service";
import type { Meeting } from "@shared/schema";

export interface ProspectSummary {
  name: string;
  company: string;
  revenue: string;
  industry: string;
  painPoints: string[];
  likelyObjections: string[];
  currentSolutions: string[];
  lookingFor: string[];
  meetingContext: string;
}

export class MorningBriefingService {
  private emailService: EmailService;
  private gmailService: GmailService;

  constructor() {
    this.emailService = new EmailService();
    this.gmailService = new GmailService();
  }

  async sendMorningBriefing() {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const meetings = await storage.getUserMeetings(1, 1000); // Get all meetings for user 1

    const todaysMeetings = meetings.filter(meeting => {
      const startTime = new Date(meeting.startTime);
      return startTime >= todayStart && startTime < todayEnd && 
             (meeting.status === 'qualified' || meeting.status === 'needs_review');
    });

    if (todaysMeetings.length === 0) {
      return; // No meetings today, skip briefing
    }

    await this.generateAndSendBriefing(todaysMeetings);
  }

  private async generateAndSendBriefing(meetings: Meeting[]) {
    try {
      const summaries = await Promise.all(
        meetings.map(meeting => this.generateProspectSummary(meeting))
      );
      
      const emailContent = this.generateMorningBriefingEmail(meetings, summaries);
      
      // Get user email (in production, this would come from authenticated user)
      const user = await storage.getUser(meetings[0].userId);
      if (!user?.email) return;

      // Try Gmail first, fallback to SMTP
      const integrations = await storage.getUserIntegrations(meetings[0].userId);
      const gmailIntegration = integrations.find(i => i.type === 'gmail');
      
      if (gmailIntegration?.accessToken) {
        // Send via Gmail API
        await this.sendBriefingViaGmail(gmailIntegration.accessToken, user.email, emailContent);
      } else {
        // Send via SMTP
        await this.emailService.sendMorningBriefing(user.email, meetings, summaries);
      }

      console.log(`Morning briefing sent for ${meetings.length} meetings`);
    } catch (error) {
      console.error(`Failed to send morning briefing:`, error);
    }
  }

  private async generateProspectSummary(meeting: Meeting): Promise<ProspectSummary> {
    const formData = meeting.formData || {};
    
    // Extract basic information
    const name = meeting.attendeeName || formData.name || "Unknown";
    const company = meeting.company || formData.company || "Unknown Company";
    const revenue = this.formatRevenue(meeting.revenue || formData.revenue);
    const industry = meeting.industry || formData.industry || "Unknown Industry";

    // Analyze pain points from form responses
    const painPoints = this.extractPainPoints(formData);
    
    // Generate likely objections based on industry and company size
    const likelyObjections = this.generateLikelyObjections(industry, revenue, formData);
    
    // Determine what they're currently using
    const currentSolutions = this.extractCurrentSolutions(formData);
    
    // Determine what they're looking for
    const lookingFor = this.extractLookingFor(formData, industry);
    
    // Generate meeting context
    const meetingContext = this.generateMeetingContext(meeting, formData);

    return {
      name,
      company,
      revenue,
      industry,
      painPoints,
      likelyObjections,
      currentSolutions,
      lookingFor,
      meetingContext
    };
  }

  private formatRevenue(revenue: any): string {
    if (!revenue) return "Not specified";
    
    if (typeof revenue === 'number') {
      if (revenue >= 1000000) {
        return `$${(revenue / 1000000).toFixed(1)}M`;
      } else if (revenue >= 1000) {
        return `$${(revenue / 1000).toFixed(0)}K`;
      } else {
        return `$${revenue}`;
      }
    }
    
    return revenue.toString();
  }

  private extractPainPoints(formData: Record<string, any>): string[] {
    const painPoints: string[] = [];
    
    // Common form fields that indicate pain points
    const painPointFields = [
      'current_challenges',
      'biggest_problem',
      'pain_points',
      'issues',
      'frustrations',
      'problems'
    ];

    painPointFields.forEach(field => {
      if (formData[field]) {
        painPoints.push(formData[field]);
      }
    });

    // If no explicit pain points, infer from other fields
    if (painPoints.length === 0) {
      if (formData.budget && formData.budget.toLowerCase().includes('tight')) {
        painPoints.push("Budget constraints");
      }
      if (formData.timeline && formData.timeline.toLowerCase().includes('urgent')) {
        painPoints.push("Time-sensitive requirements");
      }
      if (formData.current_solution && formData.current_solution.toLowerCase().includes('manual')) {
        painPoints.push("Manual processes inefficiency");
      }
    }

    return painPoints.length > 0 ? painPoints : ["Not specified in form"];
  }

  private generateLikelyObjections(industry: string, revenue: string, formData: Record<string, any>): string[] {
    const objections: string[] = [];

    // Budget-based objections
    if (revenue.includes('K') || revenue === "Not specified") {
      objections.push("Budget/pricing concerns");
      objections.push("Need to justify ROI");
    }

    // Industry-specific objections
    switch (industry.toLowerCase()) {
      case 'healthcare':
        objections.push("HIPAA compliance requirements");
        objections.push("Integration with existing EHR systems");
        break;
      case 'finance':
        objections.push("Security and compliance concerns");
        objections.push("Regulatory approval process");
        break;
      case 'technology':
        objections.push("Technical integration complexity");
        objections.push("Scalability concerns");
        break;
      default:
        objections.push("Implementation timeline concerns");
        objections.push("Change management challenges");
    }

    // Form-based objections
    if (formData.decision_timeline && formData.decision_timeline.includes('months')) {
      objections.push("Extended decision-making process");
    }

    if (formData.decision_makers && formData.decision_makers.includes('committee')) {
      objections.push("Multiple stakeholder approval needed");
    }

    return objections;
  }

  private extractCurrentSolutions(formData: Record<string, any>): string[] {
    const solutions: string[] = [];
    
    const solutionFields = [
      'current_solution',
      'current_tools',
      'existing_software',
      'current_process',
      'how_currently_handled'
    ];

    solutionFields.forEach(field => {
      if (formData[field]) {
        solutions.push(formData[field]);
      }
    });

    return solutions.length > 0 ? solutions : ["Not specified"];
  }

  private extractLookingFor(formData: Record<string, any>, industry: string): string[] {
    const lookingFor: string[] = [];
    
    const goalFields = [
      'goals',
      'objectives',
      'looking_for',
      'desired_outcome',
      'what_want_to_achieve'
    ];

    goalFields.forEach(field => {
      if (formData[field]) {
        lookingFor.push(formData[field]);
      }
    });

    // Industry-specific defaults if not specified
    if (lookingFor.length === 0) {
      switch (industry.toLowerCase()) {
        case 'technology':
          lookingFor.push("Scalable solutions", "Technical integration");
          break;
        case 'healthcare':
          lookingFor.push("Compliant solutions", "Patient data security");
          break;
        case 'finance':
          lookingFor.push("Regulatory compliance", "Risk management");
          break;
        default:
          lookingFor.push("Operational efficiency", "Cost reduction");
      }
    }

    return lookingFor;
  }

  private generateMeetingContext(meeting: Meeting, formData: Record<string, any>): string {
    const context = [];
    
    if (meeting.status === 'qualified') {
      context.push("✅ Pre-qualified lead");
    } else if (meeting.status === 'needs_review') {
      context.push("⚠️ Requires manual review");
    }

    if (formData.urgency && formData.urgency.toLowerCase().includes('high')) {
      context.push("🔥 High urgency");
    }

    if (formData.budget && formData.budget.toLowerCase().includes('approved')) {
      context.push("💰 Budget approved");
    }

    if (formData.decision_maker === 'yes') {
      context.push("👤 Decision maker on call");
    }

    const startTime = new Date(meeting.startTime);
    const duration = meeting.endTime ? 
      Math.round((new Date(meeting.endTime).getTime() - startTime.getTime()) / (1000 * 60)) : 30;
    context.push(`⏱️ ${duration} min meeting`);

    return context.join(" | ");
  }

  private generateMorningBriefingEmail(meetings: Meeting[], summaries: ProspectSummary[]): string {
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
          <div style="display: flex; justify-content: between; align-items: center; margin-bottom: 15px;">
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
              <strong style="color: #374151;">Context:</strong><br>
              <span style="font-size: 14px; color: #6b7280;">${summary.meetingContext}</span>
            </div>
          </div>

          ${summary.painPoints.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <strong style="color: #dc2626;">Key Pain Points:</strong>
            <ul style="margin: 5px 0; padding-left: 20px; color: #374151;">
              ${summary.painPoints.map(point => `<li>${point}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          ${summary.likelyObjections.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <strong style="color: #d97706;">Likely Objections:</strong>
            <ul style="margin: 5px 0; padding-left: 20px; color: #374151;">
              ${summary.likelyObjections.map(objection => `<li>${objection}</li>`).join('')}
            </ul>
          </div>
          ` : ''}

          ${summary.currentSolutions.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <strong style="color: #7c3aed;">Current Solutions:</strong>
            <ul style="margin: 5px 0; padding-left: 20px; color: #374151;">
              ${summary.currentSolutions.map(solution => `<li>${solution}</li>`).join('')}
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
    <h1 style="margin: 0; font-size: 28px; font-weight: 600;">Good Morning! 🌅</h1>
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

  private generateSummaryEmail(summary: ProspectSummary, meeting: Meeting): string {
    const startTime = new Date(meeting.startTime);
    const timeString = startTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZoneName: 'short'
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Pre-Meeting Summary</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 6px; border-left: 4px solid #667eea; }
        .highlight { background: #e3f2fd; padding: 10px; border-radius: 4px; margin: 10px 0; }
        .urgent { background: #ffebee; border-left-color: #f44336; }
        ul { padding-left: 20px; }
        li { margin: 5px 0; }
        .meeting-info { background: #e8f5e8; border-left-color: #4caf50; }
        .context { font-size: 14px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎯 Pre-Meeting Summary</h1>
        <p><strong>Meeting in 2 minutes at ${timeString}</strong></p>
        <p class="context">${summary.meetingContext}</p>
    </div>

    <div class="section meeting-info">
        <h2>👤 Prospect Overview</h2>
        <p><strong>Name:</strong> ${summary.name}</p>
        <p><strong>Company:</strong> ${summary.company}</p>
        <p><strong>Industry:</strong> ${summary.industry}</p>
        <p><strong>Revenue:</strong> ${summary.revenue}</p>
    </div>

    <div class="section">
        <h2>😰 Pain Points</h2>
        <ul>
            ${summary.painPoints.map(point => `<li>${point}</li>`).join('')}
        </ul>
    </div>

    <div class="section urgent">
        <h2>🚧 Likely Objections</h2>
        <ul>
            ${summary.likelyObjections.map(objection => `<li>${objection}</li>`).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>🔧 Current Solutions</h2>
        <ul>
            ${summary.currentSolutions.map(solution => `<li>${solution}</li>`).join('')}
        </ul>
    </div>

    <div class="section">
        <h2>🎯 What They're Looking For</h2>
        <ul>
            ${summary.lookingFor.map(goal => `<li>${goal}</li>`).join('')}
        </ul>
    </div>

    <div class="highlight">
        <h3>💡 Quick Tips for This Call</h3>
        <ul>
            <li>Address their top pain point: <strong>${summary.painPoints[0]}</strong></li>
            <li>Be ready for: <strong>${summary.likelyObjections[0]}</strong></li>
            <li>Focus on their goal: <strong>${summary.lookingFor[0]}</strong></li>
            <li>Ask about their current: <strong>${summary.currentSolutions[0]}</strong></li>
        </ul>
    </div>

    <div class="section">
        <p><em>Meeting: ${meeting.title}</em></p>
        <p><em>Generated automatically 2 minutes before your call</em></p>
    </div>
</body>
</html>
    `.trim();
  }

  private async sendBriefingViaGmail(accessToken: string, userEmail: string, emailContent: string) {
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const subject = `Morning Briefing - ${today}`;
    const rawEmail = this.createRawEmail(userEmail, subject, emailContent);

    try {
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

      console.log('Morning briefing sent via Gmail successfully');
    } catch (error) {
      console.error('Error sending morning briefing via Gmail:', error);
      throw error;
    }
  }

  private async sendViaGmail(accessToken: string, userEmail: string, emailContent: string, meeting: Meeting) {
    const startTime = new Date(meeting.startTime);
    const subject = `🎯 Pre-Meeting Summary: ${meeting.attendeeName || 'Prospect'} (${startTime.toLocaleTimeString()})`;
    
    const rawEmail = this.createRawEmail(userEmail, subject, emailContent);
    
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

  private createRawEmail(to: string, subject: string, htmlContent: string): string {
    const email = [
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      '',
      htmlContent
    ].join('\r\n');

    return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');
  }

  async startScheduler() {
    // Check every minute for morning briefing time (8 AM)
    setInterval(async () => {
      try {
        const now = new Date();
        if (now.getHours() === 8 && now.getMinutes() === 0) {
          await this.sendMorningBriefing();
        }
      } catch (error) {
        console.error('Error in morning briefing scheduler:', error);
      }
    }, 60 * 1000); // Check every minute

    console.log('Morning briefing scheduler started');
  }
}