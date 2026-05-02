import { pgTable, text, integer, boolean, jsonb, timestamp, real, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playgroundRunsTable = pgTable("playground_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  shareId: text("share_id").unique().notNull(),
  systemPrompt: text("system_prompt").notNull(),
  status: text("status").notNull().default("running"),
  hardnessScore: real("hardness_score"),
  attacksResisted: integer("attacks_resisted").default(0),
  attacksFailed: integer("attacks_failed").default(0),
  totalAttacks: integer("total_attacks").notNull().default(0),
  results: jsonb("results").default([]),
  categoryBreakdown: jsonb("category_breakdown").default({}),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertPlaygroundRunSchema = createInsertSchema(playgroundRunsTable).omit({ id: true });
export type InsertPlaygroundRun = z.infer<typeof insertPlaygroundRunSchema>;
export type PlaygroundRun = typeof playgroundRunsTable.$inferSelect;

export const shieldGenerationsTable = pgTable("shield_generations", {
  id: uuid("id").primaryKey().defaultRandom(),
  inputPrompt: text("input_prompt").notNull(),
  outputPrompt: text("output_prompt").notNull(),
  hardeningLevel: text("hardening_level").notNull().default("standard"),
  domain: text("domain"),
  techniquesApplied: jsonb("techniques_applied").default([]),
  categoriesNowResisted: jsonb("categories_now_resisted").default([]),
  estimatedScoreImprovement: integer("estimated_score_improvement"),
  diffSummaryEn: text("diff_summary_en"),
  diffSummaryAr: text("diff_summary_ar"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertShieldGenerationSchema = createInsertSchema(shieldGenerationsTable).omit({ id: true });
export type InsertShieldGeneration = z.infer<typeof insertShieldGenerationSchema>;
export type ShieldGeneration = typeof shieldGenerationsTable.$inferSelect;

export const complianceScansTable = pgTable("compliance_scans", {
  id: uuid("id").primaryKey().defaultRandom(),
  systemPrompt: text("system_prompt").notNull(),
  inputType: text("input_type").notNull().default("system_prompt"),
  frameworks: jsonb("frameworks").default(["pdpl", "nca_ecc"]),
  domain: text("domain"),
  overallScore: integer("overall_score"),
  frameworkScores: jsonb("framework_scores").default({}),
  findings: jsonb("findings").default([]),
  status: text("status").notNull().default("running"),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

export const insertComplianceScanSchema = createInsertSchema(complianceScansTable).omit({ id: true });
export type InsertComplianceScan = z.infer<typeof insertComplianceScanSchema>;
export type ComplianceScan = typeof complianceScansTable.$inferSelect;

export const leaderboardModelsTable = pgTable("leaderboard_models", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  provider: text("provider").notNull(),
  modelFamily: text("model_family"),
  isOpenSource: boolean("is_open_source").default(false),
  isArabicNative: boolean("is_arabic_native").default(false),
  evaluationEnabled: boolean("evaluation_enabled").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeaderboardModelSchema = createInsertSchema(leaderboardModelsTable).omit({});
export type InsertLeaderboardModel = z.infer<typeof insertLeaderboardModelSchema>;
export type LeaderboardModel = typeof leaderboardModelsTable.$inferSelect;

export const leaderboardRunsTable = pgTable("leaderboard_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  modelId: text("model_id").notNull().references(() => leaderboardModelsTable.id),
  runDate: text("run_date").notNull(),
  overallScore: integer("overall_score").notNull(),
  arabicScore: integer("arabic_score").notNull(),
  englishScore: integer("english_score").notNull(),
  piiProtectionScore: integer("pii_protection_score").notNull(),
  injectionResistanceScore: integer("injection_resistance_score").notNull(),
  topicAdherenceScore: integer("topic_adherence_score").notNull(),
  attacksRun: integer("attacks_run").notNull(),
  attacksResisted: integer("attacks_resisted").notNull(),
  categoryBreakdown: jsonb("category_breakdown").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeaderboardRunSchema = createInsertSchema(leaderboardRunsTable).omit({ id: true });
export type InsertLeaderboardRun = z.infer<typeof insertLeaderboardRunSchema>;
export type LeaderboardRun = typeof leaderboardRunsTable.$inferSelect;
