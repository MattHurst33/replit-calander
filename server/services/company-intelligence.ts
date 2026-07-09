import OpenAI from "openai";
import { storage } from "../storage";
import type { Meeting, CompanyCache } from "@shared/schema";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — AD-9
const RESEARCH_TIMEOUT_MS = 30 * 1000; // NFR-2

// Free/personal email providers — attendee domain resolution falls back to
// title/description parsing when the attendee's domain is one of these (FR-2.1).
const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com",
  "yahoo.com", "icloud.com", "aol.com", "protonmail.com", "msn.com",
]);

export type CompanyResearchStatus = "unresolved" | "timeout" | "completed";

export interface EnrichResult {
  status: CompanyResearchStatus;
  companyName: string | null;
  domain: string | null;
  cache?: CompanyCache;
}

interface ResolvedCompany {
  companyName: string;
  domain: string | null;
}

interface OpenAiCompanyResearch {
  overview: string;
  industry: string;
  revenueRange: string;
  employeeCount: number | null;
  headquarters: string | null;
  foundingYear: number | null;
}

export class CompanyIntelligenceService {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }

  /**
   * Resolves + researches (cache-first) the company for a meeting, then writes
   * the result back onto the meeting row so existing consumers (QualificationEngine,
   * MorningBriefingService, MeetingCard) keep working unchanged (AD-8, AD-9, AD-11).
   */
  async enrich(meeting: Meeting): Promise<EnrichResult> {
    const resolved = this.resolveCompany(meeting);

    if (!resolved) {
      await storage.updateMeeting(meeting.id, { companyResearchStatus: "unresolved" });
      return { status: "unresolved", companyName: null, domain: null };
    }

    const { companyName, domain } = resolved;

    const existing = await storage.getCompanyCache(companyName, domain);
    if (existing) {
      const ageMs = Date.now() - new Date(existing.researchedAt).getTime();
      if (ageMs < CACHE_TTL_MS) {
        await this.applyCacheToMeeting(meeting.id, existing);
        return { status: "completed", companyName, domain, cache: existing };
      }

      // Stale-while-revalidate: serve stale data now, queue a background refresh once.
      await this.applyCacheToMeeting(meeting.id, existing);
      this.queueBackgroundRefresh(existing, companyName, domain);
      return { status: "completed", companyName, domain, cache: existing };
    }

    try {
      const research = await this.researchWithTimeout(companyName);
      const cache = await storage.upsertCompanyCache({
        companyName,
        domain,
        overview: research.overview,
        industry: research.industry,
        revenueRange: research.revenueRange,
        employeeCount: research.employeeCount,
        headquarters: research.headquarters,
        foundingYear: research.foundingYear,
        source: "openai",
        researchedAt: new Date(),
        refreshQueuedAt: null,
      });
      await this.applyCacheToMeeting(meeting.id, cache);
      return { status: "completed", companyName, domain, cache };
    } catch (error) {
      console.error(`Company research failed/timed out for "${companyName}":`, error);
      await storage.updateMeeting(meeting.id, { companyResearchStatus: "timeout" });
      return { status: "timeout", companyName, domain };
    }
  }

  /** FR-2.1: attendee email domain first, falling back to title/description for generic domains. */
  private resolveCompany(meeting: Meeting): ResolvedCompany | null {
    const emailDomain = meeting.attendeeEmail?.split("@")[1]?.toLowerCase().trim();

    if (emailDomain && !GENERIC_EMAIL_DOMAINS.has(emailDomain)) {
      return { companyName: this.domainToCompanyName(emailDomain), domain: emailDomain };
    }

    const fromText = this.extractCompanyFromText(meeting.title, meeting.description);
    if (fromText) {
      return { companyName: fromText, domain: null };
    }

    return null;
  }

  private domainToCompanyName(domain: string): string {
    const base = domain.split(".")[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  }

  /** Best-effort heuristic: looks for "<Company> <meeting keyword>" or "with <Company>" patterns. */
  private extractCompanyFromText(title: string, description: string | null): string | null {
    const text = `${title} ${description ?? ""}`;

    const withMatch = text.match(/\bwith\s+([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*){0,3})/);
    if (withMatch) return withMatch[1].trim();

    const keywordMatch = text.match(/^([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*){0,3})\s*[-–:]?\s*(meeting|call|demo|sync|review|intro)/i);
    if (keywordMatch) return keywordMatch[1].trim();

    return null;
  }

  private async researchWithTimeout(companyName: string): Promise<OpenAiCompanyResearch> {
    return Promise.race([
      this.researchViaOpenAi(companyName),
      new Promise<OpenAiCompanyResearch>((_, reject) =>
        setTimeout(() => reject(new Error("Company research timeout exceeded 30s")), RESEARCH_TIMEOUT_MS),
      ),
    ]);
  }

  private async researchViaOpenAi(companyName: string): Promise<OpenAiCompanyResearch> {
    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a B2B sales research assistant. Given a company name, return your best-effort " +
            "knowledge as strict JSON with keys: overview (1-2 sentence string), industry (string), " +
            "revenueRange (human-readable string like \"$10M-$50M\", or \"Unknown\" if you don't know), " +
            "employeeCount (integer or null), headquarters (string or null), foundingYear (integer or null). " +
            "Do not fabricate specifics you are not reasonably confident about — use null/\"Unknown\" instead.",
        },
        { role: "user", content: `Company: ${companyName}` },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("Empty response from OpenAI company research");
    }

    const parsed = JSON.parse(content) as Partial<OpenAiCompanyResearch>;
    return {
      overview: parsed.overview ?? "Not available",
      industry: parsed.industry ?? "Unknown",
      revenueRange: parsed.revenueRange ?? "Unknown",
      employeeCount: parsed.employeeCount ?? null,
      headquarters: parsed.headquarters ?? null,
      foundingYear: parsed.foundingYear ?? null,
    };
  }

  /** Writes company fields onto the meeting row — required for QualificationEngine/MorningBriefing/MeetingCard (unchanged consumers). */
  private async applyCacheToMeeting(meetingId: number, cache: CompanyCache): Promise<void> {
    await storage.updateMeeting(meetingId, {
      company: cache.companyName,
      industry: cache.industry,
      revenue: this.revenueRangeToEstimate(cache.revenueRange),
      companySize: cache.employeeCount ?? undefined,
      companyResearchStatus: "completed",
    });
  }

  /** Qualification rules (gte/lte) need a numeric point-estimate; the human-readable range lives on companyCache.revenueRange. */
  private revenueRangeToEstimate(range: string | null): string | undefined {
    if (!range) return undefined;
    const matches = Array.from(range.matchAll(/\$?([\d.]+)\s*([KMB])/gi));
    if (matches.length === 0) return undefined;

    const toNumber = (value: string, unit: string): number => {
      const n = parseFloat(value);
      switch (unit.toUpperCase()) {
        case "K": return n * 1_000;
        case "M": return n * 1_000_000;
        case "B": return n * 1_000_000_000;
        default: return n;
      }
    };

    const values = matches.map((m) => toNumber(m[1], m[2]));
    const midpoint = values.reduce((sum, v) => sum + v, 0) / values.length;
    return midpoint.toFixed(2);
  }

  private queueBackgroundRefresh(existing: CompanyCache, companyName: string, domain: string | null): void {
    if (existing.refreshQueuedAt) return; // already in flight — avoid duplicate concurrent refreshes

    storage.updateCompanyCache(existing.id, { refreshQueuedAt: new Date() }).catch((err) =>
      console.error(`Failed to mark refresh queued for "${companyName}":`, err),
    );

    this.researchWithTimeout(companyName)
      .then((research) =>
        storage.upsertCompanyCache({
          companyName,
          domain,
          overview: research.overview,
          industry: research.industry,
          revenueRange: research.revenueRange,
          employeeCount: research.employeeCount,
          headquarters: research.headquarters,
          foundingYear: research.foundingYear,
          source: "openai",
          researchedAt: new Date(),
          refreshQueuedAt: null,
        }),
      )
      .catch((err) => {
        console.error(`Background refresh failed for "${companyName}":`, err);
        storage.updateCompanyCache(existing.id, { refreshQueuedAt: null }).catch(() => {});
      });
  }
}

export const companyIntelligenceService = new CompanyIntelligenceService();
