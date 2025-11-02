import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  clients, InsertClient,
  assessmentTypes,
  questions,
  assessments, InsertAssessment,
  answers, InsertAnswer,
  criterionScores, InsertCriterionScore,
  reports, InsertReport
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ User Functions ============
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Client Functions ============
export async function getClientsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(clients).where(eq(clients.userId, userId)).orderBy(desc(clients.createdAt));
}

export async function getClientById(clientId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function createClient(client: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(clients).values(client);
  return result[0].insertId;
}

export async function updateClient(clientId: number, userId: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(clients)
    .set(data)
    .where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
}

export async function deleteClient(clientId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(clients).where(and(eq(clients.id, clientId), eq(clients.userId, userId)));
}

// ============ Assessment Type Functions ============
export async function getAllAssessmentTypes() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(assessmentTypes).orderBy(assessmentTypes.name);
}

export async function getAssessmentTypeById(typeId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(assessmentTypes).where(eq(assessmentTypes.id, typeId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Question Functions ============
export async function getQuestionsByAssessmentType(assessmentTypeId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(questions)
    .where(eq(questions.assessmentTypeId, assessmentTypeId))
    .orderBy(questions.criterionNumber, questions.questionNumber);
}

export async function getQuestionById(questionId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============ Assessment Functions ============
export async function getAssessmentsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(assessments).where(eq(assessments.userId, userId)).orderBy(desc(assessments.createdAt));
}

export async function getAssessmentById(assessmentId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(assessments)
    .where(and(eq(assessments.id, assessmentId), eq(assessments.userId, userId)))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function createAssessment(assessment: InsertAssessment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(assessments).values(assessment);
  return result[0].insertId;
}

export async function updateAssessment(assessmentId: number, userId: number, data: Partial<InsertAssessment>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(assessments)
    .set(data)
    .where(and(eq(assessments.id, assessmentId), eq(assessments.userId, userId)));
}

export async function deleteAssessment(assessmentId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(assessments).where(and(eq(assessments.id, assessmentId), eq(assessments.userId, userId)));
}

// ============ Answer Functions ============
export async function getAnswersByAssessment(assessmentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(answers).where(eq(answers.assessmentId, assessmentId));
}

export async function upsertAnswer(answer: InsertAnswer) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(answers).values(answer).onDuplicateKeyUpdate({
    set: {
      score: answer.score,
      notes: answer.notes,
      updatedAt: new Date(),
    }
  });
}

export async function batchUpsertAnswers(answersList: InsertAnswer[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  for (const answer of answersList) {
    await upsertAnswer(answer);
  }
}

// ============ Criterion Score Functions ============
export async function getCriterionScoresByAssessment(assessmentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(criterionScores)
    .where(eq(criterionScores.assessmentId, assessmentId))
    .orderBy(criterionScores.criterionNumber);
}

export async function upsertCriterionScore(score: InsertCriterionScore) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(criterionScores).values(score).onDuplicateKeyUpdate({
    set: {
      averageScore: score.averageScore,
      totalQuestions: score.totalQuestions,
      answeredQuestions: score.answeredQuestions,
    }
  });
}

// ============ Report Functions ============
export async function getReportsByAssessment(assessmentId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(reports)
    .where(eq(reports.assessmentId, assessmentId))
    .orderBy(desc(reports.createdAt));
}

export async function createReport(report: InsertReport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(reports).values(report);
  return result[0].insertId;
}

export async function getReportById(reportId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(reports).where(eq(reports.id, reportId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}
