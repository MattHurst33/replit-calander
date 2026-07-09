import OpenAI from "openai";
import { storage } from "../storage";
import type { Meeting, CompanyCache } from "@shared/schema";
import { resolveCompanyName, revenueRangeToEstimate, isCacheFresh } from "./company-intelligence-utils";

export { resolveCompanyName, extractCompanyFromText, revenueRangeToEstimate, isCacheFresh } from "./company-intelligence-utils";

const RESEARCH_TIMEOUT_MS = 30 * 1000; // NFR-2

export type CompanyResearchStatus = "unresolved" | "timeout" | "completed";

export interface EnrichResult {
  status: CompanyResearchStatus;
  companyName: string | null;
  domain: string | null;
  cache?: CompanyCache;
}

interface OpenAiCompanyResearch {
  overview: string;
  industry: string;
  revenueRange: string;
  employeeCount: number | null;
  headquarters: string | null;
  foundingYear: number | null;
  productsServices: string[];
}

export class CompanyIntelligenceService {
  // Lazy — constructing eagerly would throw at module load (and crash the whole server on boot)
  // whenever OPENAI_API_KEY isn't set, since this service is imported transitively by routes.ts.
  // A missing key should only fail an individual enrich() call (caught below → 'timeout' status),
  // not prevent every other feature in the app from starting.
  private openai: OpenAI | null = null;

  private getOpenAiClient(): OpenAI {
    if (!this.openai) {
      this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this.openai;
  }

  /**
   * Resolves + researches (cache-first) the company for a meeting, then writes
   * the result back onto the meeting row so existing consumers (QualificationEngine,
   * MorningBriefingService, MeetingCard) keep working unchanged (AD-8, AD-9, AD-11).
   */
  async enrich(meeting: Meeting): Promise<EnrichResult> {
    const resolved = resolveCompanyName(meeting);

    if (!resolved) {
      await storage.updateMeeting(meeting.id, { companyResearchStatus: "unresolved" });
      return { status: "unresolved", companyName: null, domain: null };
    }

    const { companyName, domain } = resolved;

    const existing = await storage.getCompanyCache(companyName, domain);
    if (existing) {
      if (isCacheFresh(existing.researchedAt)) {
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
        productsServices: research.productsServices,
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

  private async researchWithTimeout(companyName: string): Promise<OpenAiCompanyResearch> {
    return Promise.race([
      this.researchViaOpenAi(companyName),
      new Promise<OpenAiCompanyResearch>((_, reject) =>
        setTimeout(() => reject(new Error("Company research timeout exceeded 30s")), RESEARCH_TIMEOUT_MS),
      ),
    ]);
  }

  private async researchViaOpenAi(companyName: string): Promise<OpenAiCompanyResearch> {
    const response = await this.getOpenAiClient().chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a B2B sales research assistant. Given a company name, return your best-effort " +
            "knowledge as strict JSON with keys: overview (1-2 sentence string), industry (string), " +
            "revenueRange (human-readable string like \"$10M-$50M\", or \"Unknown\" if you don't know), " +
            "employeeCount (integer or null), headquarters (string or null), foundingYear (integer or null), " +
            "productsServices (array of the company's top 3-5 product/service names as strings, or an empty " +
            "array if not confidently known). " +
            "Do not fabricate specifics you are not reasonably confident about — use null/\"Unknown\"/[] instead.",
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
      productsServices: Array.isArray(parsed.productsServices) ? parsed.productsServices : [],
    };
  }

  /** Writes company fields onto the meeting row — required for QualificationEngine/MorningBriefing/MeetingCard (unchanged consumers). */
  private async applyCacheToMeeting(meetingId: number, cache: CompanyCache): Promise<void> {
    await storage.updateMeeting(meetingId, {
      company: cache.companyName,
      industry: cache.industry,
      revenue: revenueRangeToEstimate(cache.revenueRange),
      companySize: cache.employeeCount ?? undefined,
      companyResearchStatus: "completed",
    });
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
          productsServices: research.productsServices,
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
