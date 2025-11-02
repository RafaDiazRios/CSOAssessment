import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as db from "./db";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Client management
  clients: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getClientsByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getClientById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        companyName: z.string().min(1),
        industry: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const clientId = await db.createClient({
          userId: ctx.user.id,
          ...input,
        });
        return { id: clientId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        companyName: z.string().min(1).optional(),
        industry: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateClient(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteClient(input.id, ctx.user.id);
        return { success: true };
      }),
  }),

  // Assessment types
  assessmentTypes: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllAssessmentTypes();
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getAssessmentTypeById(input.id);
      }),

    getQuestions: protectedProcedure
      .input(z.object({ assessmentTypeId: z.number() }))
      .query(async ({ input }) => {
        return await db.getQuestionsByAssessmentType(input.assessmentTypeId);
      }),
  }),

  // Assessments
  assessments: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return await db.getAssessmentsByUserId(ctx.user.id);
    }),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return await db.getAssessmentById(input.id, ctx.user.id);
      }),

    create: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        assessmentTypeId: z.number(),
        title: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const assessmentId = await db.createAssessment({
          userId: ctx.user.id,
          ...input,
        });
        return { id: assessmentId };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        status: z.enum(['in_progress', 'completed']).optional(),
        completedAt: z.date().optional(),
        totalScore: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateAssessment(id, ctx.user.id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await db.deleteAssessment(input.id, ctx.user.id);
        return { success: true };
      }),

    getProgress: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const assessment = await db.getAssessmentById(input.assessmentId, ctx.user.id);
        if (!assessment) throw new Error('Assessment not found');

        const assessmentType = await db.getAssessmentTypeById(assessment.assessmentTypeId);
        if (!assessmentType) throw new Error('Assessment type not found');

        const answers = await db.getAnswersByAssessment(input.assessmentId);
        const answeredCount = answers.filter(a => a.score !== null).length;

        return {
          totalQuestions: assessmentType.totalQuestions,
          answeredQuestions: answeredCount,
          progress: (answeredCount / assessmentType.totalQuestions) * 100,
        };
      }),

    complete: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Calculate scores
        const answers = await db.getAnswersByAssessment(input.assessmentId);
        const questions = await db.getQuestionsByAssessmentType(
          (await db.getAssessmentById(input.assessmentId, ctx.user.id))!.assessmentTypeId
        );

        // Group by criterion
        const criterionMap = new Map<number, { scores: number[], total: number, name: string }>();
        
        for (const question of questions) {
          if (!criterionMap.has(question.criterionNumber)) {
            criterionMap.set(question.criterionNumber, {
              scores: [],
              total: 0,
              name: question.criterionName,
            });
          }
          criterionMap.get(question.criterionNumber)!.total++;
        }

        // Add scores
        for (const answer of answers) {
          if (answer.score !== null) {
            const question = questions.find(q => q.id === answer.questionId);
            if (question) {
              criterionMap.get(question.criterionNumber)!.scores.push(answer.score);
            }
          }
        }

        // Calculate averages and save
        let totalScore = 0;
        let criterionCount = 0;

        const criterionPromises = Array.from(criterionMap.entries()).map(async ([criterionNumber, data]) => {
          const average = data.scores.length > 0
            ? data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length
            : 0;

          if (average > 0) {
            totalScore += average;
            criterionCount++;
          }

          await db.upsertCriterionScore({
            assessmentId: input.assessmentId,
            criterionNumber,
            criterionName: data.name,
            averageScore: average,
            totalQuestions: data.total,
            answeredQuestions: data.scores.length,
          });
        });

        await Promise.all(criterionPromises);

        const overallScore = criterionCount > 0 ? totalScore / criterionCount : 0;

        // Update assessment
        await db.updateAssessment(input.assessmentId, ctx.user.id, {
          status: 'completed',
          completedAt: new Date(),
          totalScore: overallScore,
        });

        return { success: true, totalScore: overallScore };
      }),
  }),

  // Answers
  answers: router({
    list: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify ownership
        const assessment = await db.getAssessmentById(input.assessmentId, ctx.user.id);
        if (!assessment) throw new Error('Assessment not found');

        return await db.getAnswersByAssessment(input.assessmentId);
      }),

    save: protectedProcedure
      .input(z.object({
        assessmentId: z.number(),
        questionId: z.number(),
        score: z.number().min(1).max(5).nullable(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const assessment = await db.getAssessmentById(input.assessmentId, ctx.user.id);
        if (!assessment) throw new Error('Assessment not found');

        await db.upsertAnswer(input);
        return { success: true };
      }),

    batchSave: protectedProcedure
      .input(z.object({
        assessmentId: z.number(),
        answers: z.array(z.object({
          questionId: z.number(),
          score: z.number().min(1).max(5).nullable(),
          notes: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const assessment = await db.getAssessmentById(input.assessmentId, ctx.user.id);
        if (!assessment) throw new Error('Assessment not found');

        const answersWithAssessmentId = input.answers.map(a => ({
          ...a,
          assessmentId: input.assessmentId,
        }));

        await db.batchUpsertAnswers(answersWithAssessmentId);
        return { success: true };
      }),
  }),

  // Analysis
  analysis: router({
    getScores: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify ownership
        const assessment = await db.getAssessmentById(input.assessmentId, ctx.user.id);
        if (!assessment) throw new Error('Assessment not found');

        return await db.getCriterionScoresByAssessment(input.assessmentId);
      }),

    generateInsights: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        // Verify ownership
        const assessment = await db.getAssessmentById(input.assessmentId, ctx.user.id);
        if (!assessment) throw new Error('Assessment not found');

        const client = await db.getClientById(assessment.clientId, ctx.user.id);
        const assessmentType = await db.getAssessmentTypeById(assessment.assessmentTypeId);
        const criterionScores = await db.getCriterionScoresByAssessment(input.assessmentId);
        const answers = await db.getAnswersByAssessment(input.assessmentId);
        const questions = await db.getQuestionsByAssessmentType(assessment.assessmentTypeId);

        // Find low-scoring questions
        const lowScoringQuestions = answers
          .filter(a => a.score !== null && a.score < 3)
          .map(a => {
            const q = questions.find(q => q.id === a.questionId);
            return q ? `- ${q.questionText} (Score: ${a.score}/5)` : null;
          })
          .filter(Boolean)
          .slice(0, 10);

        const prompt = `You are a business consultant analyzing assessment results.

Assessment Type: ${assessmentType?.name}
Client: ${client?.companyName}
Industry: ${client?.industry || 'Not specified'}

Criterion Scores (out of 5):
${criterionScores.map(c => `- Criterion ${c.criterionNumber} (${c.criterionName}): ${c.averageScore.toFixed(2)}/5 (${c.answeredQuestions}/${c.totalQuestions} questions answered)`).join('\n')}

Low-scoring questions (score < 3):
${lowScoringQuestions.join('\n')}

Provide a comprehensive analysis in JSON format with the following structure:
{
  "executiveSummary": "2-3 paragraph summary of overall findings",
  "keyStrengths": ["strength 1", "strength 2", "strength 3"],
  "criticalGaps": ["gap 1", "gap 2", "gap 3"],
  "actionItems": [
    {
      "priority": "High|Medium|Low",
      "title": "Action item title",
      "description": "Detailed description",
      "criterion": "Criterion name",
      "estimatedImpact": "Expected impact"
    }
  ],
  "implementationTimeline": {
    "immediate": ["action 1", "action 2"],
    "shortTerm": ["action 1", "action 2"],
    "longTerm": ["action 1", "action 2"]
  }
}`;

        const response = await invokeLLM({
          messages: [
            { role: 'system', content: 'You are a business consultant providing actionable insights.' },
            { role: 'user', content: prompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'assessment_analysis',
              strict: true,
              schema: {
                type: 'object',
                properties: {
                  executiveSummary: { type: 'string' },
                  keyStrengths: { type: 'array', items: { type: 'string' } },
                  criticalGaps: { type: 'array', items: { type: 'string' } },
                  actionItems: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        priority: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        criterion: { type: 'string' },
                        estimatedImpact: { type: 'string' },
                      },
                      required: ['priority', 'title', 'description', 'criterion', 'estimatedImpact'],
                      additionalProperties: false,
                    },
                  },
                  implementationTimeline: {
                    type: 'object',
                    properties: {
                      immediate: { type: 'array', items: { type: 'string' } },
                      shortTerm: { type: 'array', items: { type: 'string' } },
                      longTerm: { type: 'array', items: { type: 'string' } },
                    },
                    required: ['immediate', 'shortTerm', 'longTerm'],
                    additionalProperties: false,
                  },
                },
                required: ['executiveSummary', 'keyStrengths', 'criticalGaps', 'actionItems', 'implementationTimeline'],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0].message.content;
        const analysis = JSON.parse(typeof content === 'string' ? content : '');
        return analysis;
      }),
  }),

  // Reports
  reports: router({
    list: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .query(async ({ ctx, input }) => {
        // Verify ownership
        const assessment = await db.getAssessmentById(input.assessmentId, ctx.user.id);
        if (!assessment) throw new Error('Assessment not found');

        return await db.getReportsByAssessment(input.assessmentId);
      }),

    get: protectedProcedure
      .input(z.object({ reportId: z.number() }))
      .query(async ({ input }) => {
        return await db.getReportById(input.reportId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
