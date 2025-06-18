import type { IStorage } from "../storage";
import type { Meeting, QualificationRule } from "@shared/schema";
import { GoogleCalendarService } from "./google-calendar";

export class QualificationEngine {
  private googleCalendar: GoogleCalendarService;

  constructor(private storage: IStorage) {
    this.googleCalendar = new GoogleCalendarService();
  }

  async qualifyMeeting(meetingId: number): Promise<void> {
    const meeting = await this.storage.getUserMeetings(1, 1000);
    const targetMeeting = meeting.find(m => m.id === meetingId);
    
    if (!targetMeeting) {
      throw new Error('Meeting not found');
    }

    const rules = await this.storage.getUserQualificationRules(targetMeeting.userId);
    const activeRules = rules.filter(rule => rule.isActive);

    let qualified = true;
    let disqualificationReasons: string[] = [];

    for (const rule of activeRules) {
      const result = this.evaluateRule(targetMeeting, rule);
      
      if (!result.passed) {
        qualified = false;
        disqualificationReasons.push(result.reason);
      }
    }

    // Determine final status
    let status: 'qualified' | 'disqualified' | 'needs_review' = 'qualified';
    let qualificationReason = 'Meets all qualification criteria';

    if (!qualified) {
      status = 'disqualified';
      qualificationReason = disqualificationReasons.join('; ');
    } else if (this.needsManualReview(targetMeeting)) {
      status = 'needs_review';
      qualificationReason = 'Missing required data for automatic qualification';
    }

    // Update meeting status
    await this.storage.updateMeeting(meetingId, {
      status,
      qualificationReason,
      lastProcessed: new Date(),
    });

    // If meeting is disqualified, free up the Google Calendar slot
    if (status === 'disqualified' && targetMeeting.externalId) {
      await this.freeCalendarSlot(targetMeeting.userId, targetMeeting.externalId);
    }
  }

  private evaluateRule(meeting: Meeting, rule: QualificationRule): { passed: boolean; reason: string } {
    const fieldValue = this.getMeetingFieldValue(meeting, rule.field);
    
    if (fieldValue === null || fieldValue === undefined) {
      return {
        passed: false,
        reason: `Missing ${rule.field} data`
      };
    }

    const ruleValue = this.parseRuleValue(rule.value, rule.field);
    let passed = false;

    switch (rule.operator) {
      case 'gte':
        passed = Number(fieldValue) >= Number(ruleValue);
        break;
      case 'lte':
        passed = Number(fieldValue) <= Number(ruleValue);
        break;
      case 'eq':
        passed = fieldValue === ruleValue;
        break;
      case 'ne':
        passed = fieldValue !== ruleValue;
        break;
      case 'contains':
        passed = String(fieldValue).toLowerCase().includes(String(ruleValue).toLowerCase());
        break;
      case 'not_contains':
        passed = !String(fieldValue).toLowerCase().includes(String(ruleValue).toLowerCase());
        break;
      default:
        passed = false;
    }

    return {
      passed,
      reason: passed 
        ? `${rule.name}: Passed` 
        : `${rule.name}: ${fieldValue} ${rule.operator} ${ruleValue}`
    };
  }

  private getMeetingFieldValue(meeting: Meeting, field: string): any {
    switch (field) {
      case 'revenue':
        return meeting.revenue ? Number(meeting.revenue) : null;
      case 'company_size':
        return meeting.companySize;
      case 'industry':
        return meeting.industry;
      case 'budget':
        return meeting.budget ? Number(meeting.budget) : null;
      case 'company':
        return meeting.company;
      default:
        return null;
    }
  }

  private parseRuleValue(value: string, field: string): any {
    switch (field) {
      case 'revenue':
      case 'budget':
      case 'company_size':
        return Number(value.replace(/[,$]/g, ''));
      default:
        return value;
    }
  }

  private needsManualReview(meeting: Meeting): boolean {
    // Meeting needs review if critical data is missing
    const criticalFields = [meeting.revenue, meeting.companySize, meeting.company];
    const missingFields = criticalFields.filter(field => !field).length;
    
    return missingFields >= 2; // If 2 or more critical fields are missing
  }

  private async freeCalendarSlot(userId: number, externalId: string): Promise<void> {
    try {
      // Get Google Calendar integration
      const googleCalendarIntegration = await this.storage.getIntegration(userId, 'google_calendar');
      
      if (!googleCalendarIntegration || !googleCalendarIntegration.accessToken) {
        console.log('Google Calendar integration not found for user', userId);
        return;
      }

      // Extract event ID from external ID
      let eventId = externalId;
      if (externalId.startsWith('calendly_') || externalId.startsWith('gcal_')) {
        // If it's a Calendly event, we might need to find the corresponding Google Calendar event
        // For now, we'll skip Calendly events since they manage their own calendar
        if (externalId.startsWith('calendly_')) {
          console.log('Skipping Calendly event for calendar update:', externalId);
          return;
        }
        // Remove prefix for Google Calendar events
        eventId = externalId.replace('gcal_', '');
      }

      // Mark the event as free in Google Calendar
      await this.googleCalendar.markEventAsFree(googleCalendarIntegration.accessToken, eventId);
      
      console.log(`Freed calendar slot for disqualified meeting: ${eventId}`);
    } catch (error) {
      console.error('Failed to free calendar slot:', error);
      // Don't throw the error to prevent qualification process from failing
    }
  }
}
