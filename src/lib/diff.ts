import { diff_match_patch } from "diff-match-patch";

export type DiffOp = "equal" | "insert" | "delete";
export type DiffSegment = { op: DiffOp; text: string };

/**
 * Word-level diff between two strings. Uses diff-match-patch's character diff
 * then runs diff_cleanupSemantic which collapses noise into readable
 * word/phrase-aligned chunks.
 *
 * Returns segments oldest-state (revision) -> newest (current):
 *   insert  = present in CURRENT, not in REVISION (added since)
 *   delete  = present in REVISION, not in CURRENT (removed since)
 *   equal   = same in both
 */
export function computeDiff(revisionText: string, currentText: string): DiffSegment[] {
  if (!revisionText && !currentText) return [];
  const dmp = new diff_match_patch();
  const raw = dmp.diff_main(revisionText, currentText);
  dmp.diff_cleanupSemantic(raw);
  return raw.map(([opCode, text]) => ({
    op: opCode === 1 ? "insert" : opCode === -1 ? "delete" : "equal",
    text,
  }));
}
