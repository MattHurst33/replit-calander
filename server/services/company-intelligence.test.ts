import { describe, it, expect } from "vitest";
import { resolveCompanyName, extractCompanyFromText, revenueRangeToEstimate, isCacheFresh } from "./company-intelligence-utils";

describe("resolveCompanyName", () => {
  it("resolves from a non-generic attendee email domain (FR-2.1)", () => {
    const result = resolveCompanyName({ attendeeEmail: "jane@acme.com", title: "Intro call", description: null });
    expect(result).toEqual({ companyName: "Acme", domain: "acme.com" });
  });

  it("is case-insensitive on the email domain", () => {
    const result = resolveCompanyName({ attendeeEmail: "Jane@ACME.COM", title: "Intro call", description: null });
    expect(result).toEqual({ companyName: "Acme", domain: "acme.com" });
  });

  it("falls back to title parsing when the domain is generic (gmail.com)", () => {
    const result = resolveCompanyName({ attendeeEmail: "jane@gmail.com", title: "Call with Acme Corp", description: null });
    expect(result).toEqual({ companyName: "Acme Corp", domain: null });
  });

  it("falls back to title parsing when there is no attendee email at all", () => {
    const result = resolveCompanyName({ attendeeEmail: null, title: "Acme Corp demo", description: null });
    expect(result).toEqual({ companyName: "Acme Corp", domain: null });
  });

  it("returns null (unresolved) when neither the domain nor the title/description yield a company", () => {
    const result = resolveCompanyName({ attendeeEmail: "jane@gmail.com", title: "quick sync", description: "checking in" });
    expect(result).toBeNull();
  });

  it("known heuristic limitation: a capitalized non-company leading word before a keyword is still treated as a candidate", () => {
    // "Quick" is capitalized only because it's sentence-initial, not because it's a proper noun —
    // the heuristic can't tell the difference. Documented here rather than silently accepted.
    const result = resolveCompanyName({ attendeeEmail: "jane@gmail.com", title: "Quick sync", description: null });
    expect(result).toEqual({ companyName: "Quick", domain: null });
  });
});

describe("extractCompanyFromText", () => {
  it("matches a 'with <Company>' pattern", () => {
    expect(extractCompanyFromText("Intro call with Globex Inc", null)).toBe("Globex Inc");
  });

  it("matches a '<Company> <keyword>' pattern", () => {
    expect(extractCompanyFromText("Initech Demo", null)).toBe("Initech");
  });

  it("matches a hyphen-separated '<Company> - <keyword>' pattern", () => {
    expect(extractCompanyFromText("Acme Corp - Demo", null)).toBe("Acme Corp");
  });

  it("matches a colon-attached '<Company>: <keyword>' pattern without leaking the colon", () => {
    expect(extractCompanyFromText("Initech: Demo", null)).toBe("Initech");
  });

  it("returns null when no pattern matches", () => {
    expect(extractCompanyFromText("weekly sync", "just us")).toBeNull();
  });
});

describe("revenueRangeToEstimate", () => {
  it("returns the midpoint of a two-sided range", () => {
    // ($10M + $50M) / 2 = $30M
    expect(revenueRangeToEstimate("$10M-$50M")).toBe("30000000.00");
  });

  it("handles a single-sided figure", () => {
    expect(revenueRangeToEstimate("$5M")).toBe("5000000.00");
  });

  it("handles K and B suffixes", () => {
    expect(revenueRangeToEstimate("$500K-$1B")).toBe("500250000.00");
  });

  it("returns undefined for null input", () => {
    expect(revenueRangeToEstimate(null)).toBeUndefined();
  });

  it("returns undefined when the string has no parseable figures", () => {
    expect(revenueRangeToEstimate("Unknown")).toBeUndefined();
  });
});

describe("isCacheFresh", () => {
  const now = new Date("2026-07-08T12:00:00Z");

  it("is fresh just under the 24h boundary", () => {
    const researchedAt = new Date(now.getTime() - (24 * 60 * 60 * 1000 - 1000));
    expect(isCacheFresh(researchedAt, now)).toBe(true);
  });

  it("is stale just over the 24h boundary", () => {
    const researchedAt = new Date(now.getTime() - (24 * 60 * 60 * 1000 + 1000));
    expect(isCacheFresh(researchedAt, now)).toBe(false);
  });

  it("accepts a string timestamp (as Drizzle may return)", () => {
    const researchedAt = new Date(now.getTime() - 1000).toISOString();
    expect(isCacheFresh(researchedAt, now)).toBe(true);
  });
});
