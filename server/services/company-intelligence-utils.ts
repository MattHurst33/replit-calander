// Pure, dependency-free helpers for CompanyIntelligenceService — kept separate from
// company-intelligence.ts so they can be unit tested without a DB connection or OpenAI API key
// (that file imports storage/db and constructs an OpenAI client at module scope).

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — AD-9

// Free/personal email providers — attendee domain resolution falls back to
// title/description parsing when the attendee's domain is one of these (FR-2.1).
const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com",
  "yahoo.com", "icloud.com", "aol.com", "protonmail.com", "msn.com",
]);

export interface ResolvedCompany {
  companyName: string;
  domain: string | null;
}

interface MeetingIdentityFields {
  attendeeEmail: string | null;
  title: string;
  description: string | null;
}

function domainToCompanyName(domain: string): string {
  const base = domain.split(".")[0];
  return base.charAt(0).toUpperCase() + base.slice(1);
}

const MEETING_KEYWORDS = new Set(["meeting", "call", "demo", "sync", "review", "intro"]);

/** Best-effort heuristic: looks for "<Company> <meeting keyword>" or "with <Company>" patterns.
 *  Word-based rather than a single regex: a regex like `([A-Z]\w*(?:\s+[A-Z]\w*){0,3})\s*(\w+)`
 *  backtracks its *inner* greedy quantifier before its repetition count, so on "Initech Demo" it
 *  can settle on the technically-valid-but-wrong split "Initech Dem" + "o" before ever trying
 *  "Initech" + "Demo". Splitting into words up front avoids that failure mode entirely. */
export function extractCompanyFromText(title: string, description: string | null): string | null {
  const withMatch = `${title} ${description ?? ""}`.match(/\bwith\s+([A-Z][\w&.-]*(?:\s+[A-Z][\w&.-]*){0,3})/);
  if (withMatch) return withMatch[1].trim();

  // Anchored to the title only — a leading keyword is only meaningful at the start of the meeting name.
  const words = title.trim().split(/\s+/).filter(Boolean);
  for (let i = 1; i <= Math.min(4, words.length - 1); i++) {
    const keyword = words[i].replace(/[^\w]/g, "").toLowerCase();
    if (!MEETING_KEYWORDS.has(keyword)) continue;

    // A separator ("-", "–", ":") between the company name and the keyword — e.g. "Acme Corp - Demo",
    // "Initech: Demo" — can show up either as its own token or attached to the preceding word. Drop a
    // standalone separator token, then strip trailing punctuation from the last candidate word, before
    // checking capitalization — otherwise a lone "-" fails the uppercase check (losing the match
    // entirely) and a trailing ":" pollutes the returned company name.
    let candidateWords = words.slice(0, i);
    if (candidateWords.length > 1 && /^[-–:]$/.test(candidateWords[candidateWords.length - 1])) {
      candidateWords = candidateWords.slice(0, -1);
    }
    if (candidateWords.length === 0) continue;

    const cleanedWords = candidateWords.map((w, idx) =>
      idx === candidateWords.length - 1 ? w.replace(/[-–:,.]+$/, "") : w,
    );
    if (cleanedWords.length > 0 && cleanedWords.every((w) => /^[A-Z]/.test(w))) {
      return cleanedWords.join(" ");
    }
  }

  return null;
}

/** FR-2.1: attendee email domain first, falling back to title/description for generic domains. */
export function resolveCompanyName(meeting: MeetingIdentityFields): ResolvedCompany | null {
  const emailDomain = meeting.attendeeEmail?.split("@")[1]?.toLowerCase().trim();

  if (emailDomain && !GENERIC_EMAIL_DOMAINS.has(emailDomain)) {
    return { companyName: domainToCompanyName(emailDomain), domain: emailDomain };
  }

  const fromText = extractCompanyFromText(meeting.title, meeting.description);
  if (fromText) {
    return { companyName: fromText, domain: null };
  }

  return null;
}

/** Qualification rules (gte/lte) need a numeric point-estimate; the human-readable range lives on companyCache.revenueRange. */
export function revenueRangeToEstimate(range: string | null): string | undefined {
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

/** AD-9: 24h TTL. `now` is injectable for testing. */
export function isCacheFresh(researchedAt: Date | string, now: Date = new Date()): boolean {
  const ageMs = now.getTime() - new Date(researchedAt).getTime();
  return ageMs < CACHE_TTL_MS;
}
