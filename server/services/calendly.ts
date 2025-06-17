import type { InsertMeeting } from "@shared/schema";

export class CalendlyService {
  private accessToken: string;

  constructor() {
    this.accessToken = process.env.CALENDLY_ACCESS_TOKEN || '';
  }

  extractMeetingData(payload: any, formData: any[]): Omit<InsertMeeting, 'userId'> {
    // Extract basic meeting info
    const meetingData: Omit<InsertMeeting, 'userId'> = {
      externalId: payload.uri,
      title: payload.event_type.name || 'Calendly Meeting',
      description: '',
      startTime: new Date(payload.start_time),
      endTime: new Date(payload.end_time),
      attendeeEmail: payload.email,
      attendeeName: payload.name,
      status: 'pending',
      formData: formData,
    };

    // Extract qualification data from form responses
    for (const qa of formData) {
      const question = qa.question.toLowerCase();
      const answer = qa.answer;

      if (question.includes('company') && !question.includes('size')) {
        meetingData.company = answer;
      } else if (question.includes('revenue') || question.includes('arr')) {
        const revenueMatch = answer.match(/[\d,]+/);
        if (revenueMatch) {
          meetingData.revenue = revenueMatch[0].replace(/,/g, '');
        }
      } else if (question.includes('company size') || question.includes('employees')) {
        const sizeMatch = answer.match(/\d+/);
        if (sizeMatch) {
          meetingData.companySize = parseInt(sizeMatch[0]);
        }
      } else if (question.includes('industry')) {
        meetingData.industry = answer;
      } else if (question.includes('budget')) {
        const budgetMatch = answer.match(/[\d,]+/);
        if (budgetMatch) {
          meetingData.budget = budgetMatch[0].replace(/,/g, '');
        }
      }
    }

    return meetingData;
  }

  async getWebhookUrl(): Promise<string> {
    // Return the webhook URL that Calendly should call
    const baseUrl = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
    return `https://${baseUrl}/api/webhooks/calendly`;
  }

  async createWebhook(organizationUri: string): Promise<void> {
    const webhookUrl = await this.getWebhookUrl();
    
    const response = await fetch('https://api.calendly.com/webhook_subscriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: webhookUrl,
        events: ['invitee.created', 'invitee.canceled'],
        organization: organizationUri,
        scope: 'organization',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create Calendly webhook');
    }
  }

  async getUserInfo(): Promise<any> {
    const response = await fetch('https://api.calendly.com/users/me', {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Calendly user info');
    }

    return await response.json();
  }
}
