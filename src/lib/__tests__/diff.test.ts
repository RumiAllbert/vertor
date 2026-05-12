import { describe, expect, it } from "vitest";
import { computeDiff } from "../diff";

describe("computeDiff", () => {
  it("returns a single equal segment when texts match", () => {
    const diffs = computeDiff("hello world", "hello world");
    expect(diffs).toEqual([{ op: "equal", text: "hello world" }]);
  });

  it("returns equal + insert when current has new content", () => {
    const diffs = computeDiff("hello", "hello world");
    expect(diffs[0]).toEqual({ op: "equal", text: "hello" });
    expect(diffs[1].op).toBe("insert");
    expect(diffs[1].text).toBe(" world");
  });

  it("returns equal + delete when current is shorter", () => {
    const diffs = computeDiff("hello world", "hello");
    expect(diffs[0]).toEqual({ op: "equal", text: "hello" });
    expect(diffs[1].op).toBe("delete");
    expect(diffs[1].text).toBe(" world");
  });

  it("emits a clean word-level swap", () => {
    const diffs = computeDiff("the breath of a voice", "the pulse of a voice");
    const ops = diffs.map((d) => d.op).join("|");
    expect(ops).toContain("delete");
    expect(ops).toContain("insert");
    expect(diffs.find((d) => d.op === "delete")?.text).toContain("breath");
    expect(diffs.find((d) => d.op === "insert")?.text).toContain("pulse");
  });

  it("collapses character-level noise into word-level chunks", () => {
    const diffs = computeDiff("Hello world", "Hello cruel world");
    const insert = diffs.find((d) => d.op === "insert");
    expect(insert?.text).toContain("cruel");
  });

  it("returns empty array when both texts are empty", () => {
    expect(computeDiff("", "")).toEqual([]);
  });
});
