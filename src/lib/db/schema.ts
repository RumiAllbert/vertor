import {
  pgTable,
  text,
  timestamp,
  primaryKey,
  integer,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

export type PersonalityValue = {
  title: string;
  blurb: string;
  traits: [string, string, string];
  generatedAt: string;
};

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  personality: jsonb("personality").$type<PersonalityValue | null>(),
  personalityDocCount: integer("personalityDocCount").notNull().default(0),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ],
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })],
);

// document.id is `text` rather than `uuid` so the client can supply its own
// nanoid-style ids on POST. This keeps client state and server state in sync
// across a single document's lifetime — without a text id, a PATCH that
// doesn't match falls back to POST, which would otherwise mint a fresh
// server-side UUID and leave the client referencing the old id forever.
export const documents = pgTable("document", {
  id: text("id").primaryKey(),
  userId: text("userId").references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Untitled"),
  sourceText: text("sourceText").notNull().default(""),
  translatedText: text("translatedText").notNull().default(""),
  sourceLang: text("sourceLang").notNull().default("auto"),
  targetLang: text("targetLang").notNull().default("en"),
  modelId: text("modelId").notNull().default("gemini-3.1-pro-preview"),
  createdAt: timestamp("createdAt", { mode: "date" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "date" }).defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type RevisionKind = "translated" | "variation" | "edit" | "restored";

export const revisions = pgTable(
  "revision",
  {
    id: text("id").primaryKey(),
    documentId: text("documentId")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ts: timestamp("ts", { mode: "date" }).defaultNow().notNull(),
    kind: text("kind").$type<RevisionKind>().notNull(),
    modelId: text("modelId"),
    summary: text("summary"),
    sourceText: text("sourceText").notNull(),
    translatedText: text("translatedText").notNull(),
  },
  (table) => [index("revision_doc_ts_idx").on(table.documentId, table.ts.desc())],
);

export type Revision = typeof revisions.$inferSelect;
export type NewRevision = typeof revisions.$inferInsert;
