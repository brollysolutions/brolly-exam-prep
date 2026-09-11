/**
 * Zod schemas + inferred types matching services/api's /v1 endpoints, plus
 * an ApiClient interface with one method per endpoint.
 *
 * Keep this file in sync with services/api/app/schemas.py -- see
 * .claude/rules/api.md ("Every request/response model has a matching zod
 * schema in packages/api-contracts").
 *
 * `pnpm contracts:gen` (openapi-typescript, run against a locally running
 * API) generates src/generated/openapi.d.ts as a raw OpenAPI type mirror;
 * this file is the hand-maintained, ergonomic layer consumers should
 * actually import from.
 */

import { z } from "zod";

// ------------------------------------------------------------- Primitives --

export const LangSchema = z.enum(["en", "te"]);
export type Lang = z.infer<typeof LangSchema>;

export const PostSchema = z.enum(["pc", "si"]);
export type Post = z.infer<typeof PostSchema>;

export const CategorySchema = z.enum(["OC", "EWS", "BC", "SC", "ST", "ExS"]);
export type Category = z.infer<typeof CategorySchema>;

/**
 * The app and @tslprb/fixtures address categories by lower-case id ("oc", "exs", ...)
 * because that is what the onboarding grid and the i18n label keys use; the API spells
 * them "OC" / "ExS". These two are the only sanctioned crossing point -- convert at the
 * HTTP boundary, never inside a store or a screen.
 */
export const CATEGORY_IDS = ["oc", "ews", "bc", "sc", "st", "exs"] as const;
export type CategoryIdLower = (typeof CATEGORY_IDS)[number];

const CATEGORY_TO_API: Record<CategoryIdLower, Category> = {
  oc: "OC",
  ews: "EWS",
  bc: "BC",
  sc: "SC",
  st: "ST",
  exs: "ExS",
};

const CATEGORY_FROM_API: Record<Category, CategoryIdLower> = {
  OC: "oc",
  EWS: "ews",
  BC: "bc",
  SC: "sc",
  ST: "st",
  ExS: "exs",
};

/** Fixture / app id -> the wire spelling. */
export const toApiCategory = (id: CategoryIdLower): Category => CATEGORY_TO_API[id];

/** Wire spelling -> the fixture / app id. */
export const fromApiCategory = (category: Category): CategoryIdLower =>
  CATEGORY_FROM_API[category];

export const LocalizedTextSchema = z.object({
  en: z.string(),
  te: z.string(),
});
export type LocalizedText = z.infer<typeof LocalizedTextSchema>;

export const LocalizedOptionsSchema = z.object({
  en: z.array(z.string()),
  te: z.array(z.string()),
});
export type LocalizedOptions = z.infer<typeof LocalizedOptionsSchema>;

// ----------------------------------------------------------------- Sign-in --

/**
 * The number is the whole credential. There is no second factor: the OTP step was removed on
 * the product owner's instruction (2026-09-07), so possession of a number is not proved — the
 * account belongs to whoever types the digits. An SMS or a password is what would change that,
 * and until one lands this endpoint must not guard anything a stranger may not see.
 */
export const PhoneSignInSchema = z.object({
  phone: z.string().min(10).max(15),
});
export type PhoneSignIn = z.infer<typeof PhoneSignInSchema>;

export const UserSchema = z.object({
  id: z.string(),
  phone: z.string(),
});
export type User = z.infer<typeof UserSchema>;

/** The same shape the verify step used to return: a token, and who it belongs to. */
export const PhoneSignInResponseSchema = z.object({
  token: z.string(),
  user: UserSchema,
});
export type PhoneSignInResponse = z.infer<typeof PhoneSignInResponseSchema>;

// ------------------------------------------------------------------ Tests --

export const QuestionSchema = z.object({
  id: z.string(),
  section_id: z.string(),
  order_index: z.number().int(),
  text: LocalizedTextSchema,
  options: LocalizedOptionsSchema,
});
export type Question = z.infer<typeof QuestionSchema>;

export const SectionSchema = z.object({
  id: z.string(),
  name: LocalizedTextSchema,
  order_index: z.number().int(),
  questions: z.array(QuestionSchema),
});
export type Section = z.infer<typeof SectionSchema>;

export const TestSummarySchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  post: PostSchema,
  duration_minutes: z.number().int(),
  total_marks: z.number(),
  section_count: z.number().int(),
  question_count: z.number().int(),
});
export type TestSummary = z.infer<typeof TestSummarySchema>;

export const TestSchema = TestSummarySchema.extend({
  sections: z.array(SectionSchema),
});
export type Test = z.infer<typeof TestSchema>;

export const SectionSpecSchema = z.object({
  id: z.string(),
  label_key: z.string(),
  questions: z.number().int().nonnegative(),
  unlock_after: z.string().nullable().optional(),
});
export type SectionSpec = z.infer<typeof SectionSpecSchema>;

export const ExamPatternSchema = z.object({
  id: z.string(),
  post: PostSchema,
  total_questions: z.number().int().nonnegative(),
  duration_minutes: z.number().int().positive(),
  marks_per_correct: z.number(),
  negative_per_wrong: z.number().nonnegative(),
  qualifying_only: z.boolean(),
  sections: z.array(SectionSpecSchema),
  verified: z.boolean(),
  source: z.string(),
});
export type ExamPattern = z.infer<typeof ExamPatternSchema>;

export const AttemptedSummarySchema = z.object({
  best_score: z.number(),
  attempts: z.number().int().nonnegative(),
});

export const TestMetaSchema = z.object({
  id: z.string(),
  kind: z.enum(["full", "previous"]),
  title: LocalizedTextSchema,
  pattern: ExamPatternSchema,
  full_mocks_only: z.boolean().default(false),
  listed: z.boolean().default(true),
  free: z.boolean(),
  attempted: AttemptedSummarySchema.nullable().optional(),
});
export type TestMeta = z.infer<typeof TestMetaSchema>;

export const PaperQuestionSchema = z.object({
  id: z.string(),
  section: z.string(),
  text: LocalizedTextSchema,
  options: LocalizedOptionsSchema,
  avg_seconds: z.number().int().nonnegative(),
});
export type PaperQuestion = z.infer<typeof PaperQuestionSchema>;

// --------------------------------------------------------------- Attempts --

export const AttemptCreateSchema = z.object({
  test_id: z.string(),
  /**
   * Optional client-owned idempotency key (the device's local attempt id). A retried
   * create with the same key returns the same server attempt, so an offline-created
   * attempt can be backfilled with a server id without risking a duplicate POST.
   */
  client_attempt_id: z.string().optional(),
});
export type AttemptCreate = z.infer<typeof AttemptCreateSchema>;

export const AttemptSchema = z.object({
  id: z.string(),
  test_id: z.string(),
  started_at: z.string(),
  ends_at: z.string(),
  status: z.enum(["in_progress", "submitted", "auto_submitted"]),
});
export type Attempt = z.infer<typeof AttemptSchema>;

export const AttemptAnswerSchema = z.object({
  question_id: z.string(),
  choice: z.number().int().nullable(),
  marked: z.boolean(),
});
export type AttemptAnswer = z.infer<typeof AttemptAnswerSchema>;

export const AttemptDetailSchema = AttemptSchema.extend({
  answers: z.array(AttemptAnswerSchema),
});
export type AttemptDetail = z.infer<typeof AttemptDetailSchema>;

export const AnswerPatchSchema = z.object({
  question_id: z.string(),
  choice: z.number().int().nullable().optional(),
  marked: z.boolean().optional().default(false),
});
export type AnswerPatch = z.infer<typeof AnswerPatchSchema>;
/**
 * Request-body type. `marked` has a zod `.default(false)`, so the *output* type
 * (`AnswerPatch`) makes it required -- which defeats the default for callers. Use this
 * input type wherever a body is being *sent*; use `AnswerPatch` for a parsed body.
 */
export type AnswerPatchInput = z.input<typeof AnswerPatchSchema>;

export const OkSchema = z.object({
  ok: z.boolean(),
});
export type Ok = z.infer<typeof OkSchema>;

export const SubmitResponseSchema = z.object({
  result_id: z.string(),
});
export type SubmitResponse = z.infer<typeof SubmitResponseSchema>;

// ---------------------------------------------------------------- Results --

export const SectionScoreSchema = z.object({
  section_id: z.string(),
  name: LocalizedTextSchema,
  correct: z.number().int(),
  wrong: z.number().int(),
  skipped: z.number().int(),
  marks: z.number(),
});
export type SectionScore = z.infer<typeof SectionScoreSchema>;

export const WrongAnswerSchema = z.object({
  question_id: z.string(),
  text: LocalizedTextSchema,
  options: LocalizedOptionsSchema,
  your_choice: z.number().int().nullable(),
  correct_choice: z.number().int(),
  explanation: LocalizedTextSchema,
});
export type WrongAnswer = z.infer<typeof WrongAnswerSchema>;

export const ResultSchema = z.object({
  id: z.string(),
  test_id: z.string(),
  attempt_id: z.string().nullable().optional(),
  score: z.number(),
  max_score: z.number(),
  cutoff: z.number(),
  qualified: z.boolean(),
  rank: z.number().int().nullable(),
  accuracy: z.number(),
  per_section: z.array(SectionScoreSchema),
  wrong: z.array(WrongAnswerSchema),
});
export type Result = z.infer<typeof ResultSchema>;

export const ResultActionSchema = z.object({
  id: z.string(),
  title: LocalizedTextSchema,
  sub: LocalizedTextSchema,
});

export const ResultReviewRowSchema = z.object({
  question_no: z.number().int().positive(),
  your: z.number().int().nullable(),
  seconds: z.number().int().nonnegative(),
});

export const ResultDetailSchema = z.object({
  id: z.string(),
  test_title_n: z.number().int().nonnegative(),
  title: LocalizedTextSchema.nullable().optional(),
  score: z.number(),
  max_score: z.number(),
  cutoff_pct: z.number(),
  qualified: z.boolean(),
  rank: z.number().int().nullable().optional(),
  total_candidates: z.number().int().nullable().optional(),
  accuracy_pct: z.number(),
  avg_seconds_per_question: z.number(),
  negative_marks: z.number(),
  correct: z.number().int().nonnegative(),
  wrong: z.number().int().nonnegative(),
  skipped: z.number().int().nonnegative(),
  actions: z.array(ResultActionSchema),
  review: z.array(ResultReviewRowSchema),
});
export type ResultDetail = z.infer<typeof ResultDetailSchema>;

export const ReviewQuestionSchema = PaperQuestionSchema.extend({
  your_choice: z.number().int().nullable(),
  marked: z.boolean(),
  correct_choice: z.number().int(),
  explanation: LocalizedTextSchema,
  seconds: z.number().int().nonnegative(),
});
export type ReviewQuestion = z.infer<typeof ReviewQuestionSchema>;

// ---------------------------------------------------------------- Content --

export const NoticeSchema = z.object({
  id: z.string(),
  kind: z.enum(["notification", "admit_card", "exam_date", "result", "pet"]),
  date: z.string(),
  title: LocalizedTextSchema,
  body: LocalizedTextSchema,
  link: z.string().nullable().optional(),
});

export const AffairSchema = z.object({
  id: z.string(),
  date: z.string(),
  category: z.enum(["india", "telangana", "world", "sports", "awards"]),
  headline: LocalizedTextSchema,
  summary: LocalizedTextSchema,
});

export const StudyBlockSchema = z.object({
  kind: z.enum(["heading", "para", "bullets", "formula", "example", "tip"]),
  text: LocalizedTextSchema.nullable().optional(),
  items: z.array(LocalizedTextSchema).nullable().optional(),
});

export const StudyTopicSchema = z.object({
  id: z.string(),
  section: z.string(),
  title: LocalizedTextSchema,
  minutes: z.number().int().nonnegative(),
  blocks: z.array(StudyBlockSchema),
});

export const StudySectionSchema = z.object({
  id: z.string(),
  label_key: z.string(),
  topics: z.array(StudyTopicSchema),
});

export const StandardSchema = z.object({
  value: z.number(),
  dir: z.enum(["min", "max"]),
  verified: z.boolean(),
});

export const PhysicalStandardsSchema = z.object({
  post: PostSchema,
  gender: z.enum(["male", "female"]),
  group: z.enum(["general", "st"]),
  height: StandardSchema,
  chest: z
    .object({ unexpanded: StandardSchema, expansion: StandardSchema })
    .nullable()
    .optional(),
  run_1600m: StandardSchema.nullable().optional(),
  run_800m: StandardSchema.nullable().optional(),
  run_100m: StandardSchema.nullable().optional(),
  long_jump: StandardSchema,
  shot_put: StandardSchema,
  shot_kg: z.number(),
});

export const ContentSchema = z.object({
  version: z.string(),
  notices: z.array(NoticeSchema),
  affairs: z.array(AffairSchema),
  study_sections: z.array(StudySectionSchema),
  exam_info: z.object({ pwt_date: z.string(), label: LocalizedTextSchema }),
  categories: z.array(
    z.object({ id: z.string(), label_key: z.string(), qualifying_pct: z.number() }),
  ),
  cost_rows: z.record(z.array(z.array(z.string()))),
  physical_standards: z.array(PhysicalStandardsSchema),
  standards_notification_year: z.number().int(),
});
export type Content = z.infer<typeof ContentSchema>;

// ------------------------------------------------------------- ApiClient --

/**
 * One method per services/api /v1 endpoint (plus /health). Implementations
 * (e.g. an httpx/fetch wrapper in apps/*) should validate responses against
 * the schemas above.
 */
export interface ApiClient {
  health(): Promise<{ status: string }>;

  signInWithPhone(body: PhoneSignIn): Promise<PhoneSignInResponse>;

  listTests(): Promise<TestSummary[]>;
  getTest(id: string): Promise<Test>;

  createAttempt(body: AttemptCreate): Promise<Attempt>;
  patchAttemptAnswer(attemptId: string, body: AnswerPatchInput): Promise<Ok>;
  submitAttempt(attemptId: string): Promise<SubmitResponse>;

  getResult(id: string): Promise<Result>;
}

/**
 * Complete v0.2 HTTP surface. The `*Response` suffix distinguishes raw snake_case wire
 * projections from the fixture-shaped methods that existing app adapters map to camelCase.
 */
export interface ApiV2Client extends ApiClient {
  getContent(): Promise<Content>;
  listTestCatalog(): Promise<TestMeta[]>;
  getTestMetaResponse(id: string): Promise<TestMeta>;
  getTestPaper(id: string): Promise<PaperQuestion[]>;
  getAttempt(id: string): Promise<AttemptDetail>;
  getAttemptPaper(id: string): Promise<PaperQuestion[]>;
  getAttemptMeta(id: string): Promise<TestMeta>;
  getResultDetailResponse(id: string): Promise<ResultDetail>;
  getResultPaper(id: string): Promise<ReviewQuestion[]>;
}
