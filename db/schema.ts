import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const aiPostureAssessments = sqliteTable(
  "ai_posture_assessments",
  {
    id: text("id").primaryKey(),
    clientToken: text("client_token").notNull(),
    assetToken: text("asset_token").notNull(),
    status: text("status").notNull().default("DRAFT"),
    source: text("source"),
    language: text("language").notNull().default("zh-CN"),
    embedded: integer("embedded", { mode: "boolean" }).notNull().default(false),
    profileJson: text("profile_json").notNull(),
    uploadJson: text("upload_json").notNull().default("{}"),
    reportJson: text("report_json"),
    annotatedJson: text("annotated_json"),
    engineVersion: text("engine_version"),
    error: text("error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    submittedAt: text("submitted_at"),
    processingAt: text("processing_at"),
    completedAt: text("completed_at"),
  },
  (table) => [index("ai_posture_status_created_idx").on(table.status, table.createdAt)],
);
