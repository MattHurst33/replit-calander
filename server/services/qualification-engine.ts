import type { IStorage } from "../storage";
import type { Meeting, QualificationRule } from "@shared/schema";

export class QualificationEngine {
  constructor(private storage: IStorage) {}

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
}
