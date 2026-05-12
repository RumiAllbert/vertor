import { describe, expect, it } from "vitest";
import { computeStats, wordCount, type StatDoc } from "../stats";

const memberSince = new Date("2026-01-01T00:00:00Z");
const now = new Date("2026-02-15T12:00:00Z");

function doc(partial: Partial<StatDoc> & { id: string; createdAt: Date }): StatDoc {
  return {
    id: partial.id,
    title: partial.title ?? "Untitled",
    sourceText: partial.sourceText ?? "",
    sourceLang: partial.sourceLang ?? "auto",
    targetLang: partial.targetLang ?? "en",
    modelId: partial.modelId ?? "gemini-3.1-flash-lite-preview",
    createdAt: partial.createdAt,
    updatedAt: partial.updatedAt ?? partial.createdAt,
  };
}

describe("wordCount", () => {
  it("returns 0 for empty / whitespace", () => {
    expect(wordCount("")).toBe(0);
    expect(wordCount("   \n\t  ")).toBe(0);
  });
  it("splits on whitespace", () => {
    expect(wordCount("hello world")).toBe(2);
    expect(wordCount("  one   two\nthree  ")).toBe(3);
  });
});

describe("computeStats", () => {
  it("returns an empty shape when no docs", () => {
    const s = computeStats([], memberSince, now);
    expect(s.totalDocs).toBe(0);
    expect(s.totalWords).toBe(0);
    expect(s.languagesReached).toBe(0);
    expect(s.avgWordsPerDoc).toBe(0);
    expect(s.topLanguages).toEqual([]);
    expect(s.topPair).toBeNull();
    expect(s.longest).toBeNull();
    expect(s.mostActiveWeekday).toBeNull();
    expect(s.activityLast30).toHaveLength(30);
    expect(s.recent).toEqual([]);
  });

  it("computes totals for a single doc", () => {
    const s = computeStats(
      [doc({ id: "a", sourceText: "one two three", sourceLang: "en", targetLang: "es", createdAt: now })],
      memberSince,
      now,
    );
    expect(s.totalDocs).toBe(1);
    expect(s.totalWords).toBe(3);
    expect(s.languagesReached).toBe(1);
    expect(s.avgWordsPerDoc).toBe(3);
    expect(s.topLanguages[0].code).toBe("es");
    expect(s.topPair?.source).toBe("en");
    expect(s.topPair?.target).toBe("es");
    expect(s.longest?.id).toBe("a");
    expect(s.longest?.words).toBe(3);
  });

  it("excludes target=auto from languages reached", () => {
    const s = computeStats(
      [doc({ id: "a", sourceText: "x y", targetLang: "auto", createdAt: now })],
      memberSince,
      now,
    );
    expect(s.languagesReached).toBe(0);
    expect(s.topLanguages).toEqual([]);
  });

  it("picks the most-common pair", () => {
    const docs = [
      doc({ id: "1", sourceLang: "en", targetLang: "ja", sourceText: "a", createdAt: now }),
      doc({ id: "2", sourceLang: "en", targetLang: "ja", sourceText: "b", createdAt: now }),
      doc({ id: "3", sourceLang: "es", targetLang: "fr", sourceText: "c", createdAt: now }),
    ];
    const s = computeStats(docs, memberSince, now);
    expect(s.topPair?.source).toBe("en");
    expect(s.topPair?.target).toBe("ja");
    expect(s.topPair?.count).toBe(2);
  });

  it("identifies the longest doc by word count", () => {
    const docs = [
      doc({ id: "short", sourceText: "one two", createdAt: now }),
      doc({ id: "long", sourceText: "a b c d e f g h", createdAt: now }),
      doc({ id: "mid", sourceText: "alpha beta gamma", createdAt: now }),
    ];
    const s = computeStats(docs, memberSince, now);
    expect(s.longest?.id).toBe("long");
    expect(s.longest?.words).toBe(8);
  });

  it("computes most-active weekday", () => {
    // 2026-02-15 is a Sunday (0). Add three Sundays + one Monday.
    const sun1 = new Date("2026-02-01T12:00:00Z"); // Sunday
    const sun2 = new Date("2026-02-08T12:00:00Z"); // Sunday
    const sun3 = new Date("2026-02-15T12:00:00Z"); // Sunday
    const mon = new Date("2026-02-02T12:00:00Z"); // Monday
    const docs = [
      doc({ id: "1", createdAt: sun1 }),
      doc({ id: "2", createdAt: sun2 }),
      doc({ id: "3", createdAt: sun3 }),
      doc({ id: "4", createdAt: mon }),
    ];
    const s = computeStats(docs, memberSince, now);
    expect(s.mostActiveWeekday).toBe(0);
  });

  it("returns the last 5 recent docs sorted by updatedAt", () => {
    const docs = Array.from({ length: 8 }, (_, i) =>
      doc({
        id: `d${i}`,
        title: `Doc ${i}`,
        createdAt: new Date(`2026-02-0${1 + i}T00:00:00Z`),
        updatedAt: new Date(`2026-02-0${1 + i}T00:00:00Z`),
      }),
    );
    const s = computeStats(docs, memberSince, now);
    expect(s.recent).toHaveLength(5);
    expect(s.recent[0].id).toBe("d7");
    expect(s.recent[4].id).toBe("d3");
  });

  it("fills 30-day window with createdAt counts", () => {
    const docs = [
      doc({ id: "today", createdAt: now }),
      doc({ id: "today2", createdAt: now }),
      doc({ id: "yesterday", createdAt: new Date("2026-02-14T03:00:00Z") }),
      doc({ id: "old", createdAt: new Date("2025-01-01T00:00:00Z") }),
    ];
    const s = computeStats(docs, memberSince, now);
    const last = s.activityLast30[s.activityLast30.length - 1];
    const secondLast = s.activityLast30[s.activityLast30.length - 2];
    expect(last.day).toBe("2026-02-15");
    expect(last.count).toBe(2);
    expect(secondLast.day).toBe("2026-02-14");
    expect(secondLast.count).toBe(1);
    const totalInWindow = s.activityLast30.reduce((a, b) => a + b.count, 0);
    expect(totalInWindow).toBe(3); // old doc excluded
  });
});
