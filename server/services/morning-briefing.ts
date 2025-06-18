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
      
      // Get user email (in production, this would come from authenticated user)
      const user = await storage.getUser(meetings[0].userId);
      if (!user?.email) return;

      // Try Gmail first, fallback to SMTP
      const integrations = await storage.getUserIntegrations(meetings[0].userId);
      const gmailIntegration = integrations.find(i => i.type === 'gmail');
      
      if (gmailIntegration?.accessToken) {
        // Send via Gmail API
        await this.sendBriefingViaGmail(gmailIntegration.accessToken, user.email, meetings, summaries);
      } else {
        // Send via SMTP
        // Fallback to basic email (skip SMTP for now)
        console.log('Would send morning briefing via SMTP to:', user.email);
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
    
    return String(revenue);
  }

  private extractPainPoints(formData: Record<string, any>): string[] {
    const painPoints = [];
    
    // Look for common pain point fields
    if (formData.challenges) painPoints.push(formData.challenges);
    if (formData.problems) painPoints.push(formData.problems);
    if (formData.pain_points) painPoints.push(formData.pain_points);
    if (formData.biggest_challenge) painPoints.push(formData.biggest_challenge);
    
    // Look for specific business challenges
    if (formData.growth_challenges) painPoints.push("Growth challenges: " + formData.growth_challenges);
    if (formData.efficiency_issues) painPoints.push("Efficiency issues: " + formData.efficiency_issues);
    if (formData.cost_concerns) painPoints.push("Cost concerns: " + formData.cost_concerns);
    
    return painPoints.filter(Boolean).slice(0, 3); // Limit to top 3
  }

  private generateLikelyObjections(industry: string, revenue: string, formData: Record<string, any>): string[] {
    const objections = [];
    
    // Budget-based objections
    if (revenue.includes('K') || revenue === 'Not specified') {
      objections.push("Budget constraints");
    }
    
    // Industry-specific objections
    switch (industry.toLowerCase()) {
      case 'healthcare':
        objections.push("Compliance concerns", "HIPAA requirements");
        break;
      case 'finance':
        objections.push("Regulatory compliance", "Security requirements");
        break;
      case 'education':
        objections.push("Limited budget", "Approval process complexity");
        break;
      default:
        objections.push("Need to consult with team", "Timing concerns");
    }
    
    // Timeline objections
    if (formData.urgency && formData.urgency.toLowerCase().includes('low')) {
      objections.push("Not urgent priority");
    }
    
    return objections.slice(0, 3); // Limit to top 3
  }

  private extractCurrentSolutions(formData: Record<string, any>): string[] {
    const solutions = [];
    
    if (formData.current_solution) solutions.push(formData.current_solution);
    if (formData.existing_tools) solutions.push(formData.existing_tools);
    if (formData.current_vendor) solutions.push("Using " + formData.current_vendor);
    if (formData.software) solutions.push(formData.software);
    
    return solutions.filter(Boolean).slice(0, 3); // Limit to top 3
  }

  private extractLookingFor(formData: Record<string, any>, industry: string): string[] {
    const lookingFor = [];
    
    if (formData.goals) lookingFor.push(formData.goals);
    if (formData.objectives) lookingFor.push(formData.objectives);
    if (formData.desired_outcome) lookingFor.push(formData.desired_outcome);
    
    // Industry-specific expectations
    if (lookingFor.length === 0) {
      switch (industry.toLowerCase()) {
        case 'technology':
          lookingFor.push("Scalability", "Innovation");
          break;
        case 'healthcare':
          lookingFor.push("Patient care improvement", "Compliance support");
          break;
        case 'finance':
          lookingFor.push("Regulatory compliance", "Risk management");
          break;
        default:
          lookingFor.push("Operational efficiency", "Cost reduction");
      }
    }

    return lookingFor.slice(0, 3); // Limit to top 3
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

  private async sendBriefingViaGmail(accessToken: string, userEmail: string, meetings: Meeting[], summaries: ProspectSummary[]) {
    const today = new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric' 
    });
    
    const subject = `Morning Briefing - ${today}`;
    const emailContent = this.generateMorningBriefingEmail(meetings, summaries);
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

export const morningBriefingService = new MorningBriefingService();