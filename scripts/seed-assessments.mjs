import { drizzle } from 'drizzle-orm/mysql2';
import { readFileSync } from 'fs';
// Import directly without TypeScript
const assessmentTypesTable = 'assessmentTypes';
const questionsTable = 'questions';

import mysql from 'mysql2/promise';

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

async function seedAssessments() {
  console.log('Starting database seeding...');

  try {
    // Read the extracted questions JSON
    const questionsData = JSON.parse(
      readFileSync('/home/ubuntu/assessment_questions.json', 'utf-8')
    );

    console.log(`Loaded ${questionsData.length} questions from JSON`);

    // Group questions by assessment type
    const assessmentMap = {};
    for (const q of questionsData) {
      if (!assessmentMap[q.assessment]) {
        assessmentMap[q.assessment] = [];
      }
      assessmentMap[q.assessment].push(q);
    }

    // Insert assessment types
    console.log('\nInserting assessment types...');
    const assessmentTypeIds = {};

    for (const [name, questions] of Object.entries(assessmentMap)) {
      const description = getAssessmentDescription(name);
      
      const [result] = await connection.execute(
        'INSERT INTO assessmentTypes (name, description, totalQuestions) VALUES (?, ?, ?)',
        [name, description, questions.length]
      );
      /*const [result] = await db.insert(assessmentTypes).values({
        name,
        description,
        totalQuestions: questions.length,
      });

      */
      assessmentTypeIds[name] = result.insertId;
      console.log(`  ✓ ${name}: ${questions.length} questions (ID: ${result.insertId})`);
    }

    // Insert questions in batches
    console.log('\nInserting questions...');
    const batchSize = 100;
    let totalInserted = 0;

    for (const [assessmentName, assessmentQuestions] of Object.entries(assessmentMap)) {
      const assessmentTypeId = assessmentTypeIds[assessmentName];
      
      for (let i = 0; i < assessmentQuestions.length; i += batchSize) {
        const batch = assessmentQuestions.slice(i, i + batchSize);
        
        const values = batch.map(q => ({
          assessmentTypeId,
          criterionNumber: q.criterion_number,
          criterionName: q.criterion_name,
          questionNumber: q.question_number,
          questionText: q.question_text,
        }));

        // Batch insert questions
        const placeholders = values.map(() => '(?, ?, ?, ?, ?)').join(',');
        const flatValues = values.flatMap(v => [
          v.assessmentTypeId,
          v.criterionNumber,
          v.criterionName,
          v.questionNumber,
          v.questionText
        ]);
        
        await connection.execute(
          `INSERT INTO questions (assessmentTypeId, criterionNumber, criterionName, questionNumber, questionText) VALUES ${placeholders}`,
          flatValues
        );
        totalInserted += values.length;
        
        process.stdout.write(`\r  Progress: ${totalInserted}/${questionsData.length} questions inserted`);
      }
    }

    console.log('\n\n✅ Database seeding completed successfully!');
    console.log('\nSummary:');
    console.log(`  - Assessment Types: ${Object.keys(assessmentMap).length}`);
    console.log(`  - Total Questions: ${totalInserted}`);

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

function getAssessmentDescription(name) {
  const descriptions = {
    'Business Control': 'Comprehensive assessment of business control practices, process architecture, design and quality management. Covers 7 key criteria: Recognize, Define, Measure, Analyze, Improve, Control, and Sustain.',
    'IT Management Services': 'Assessment framework for IT management services, infrastructure, and technology governance. Evaluates IT service delivery, management practices, and alignment with business objectives.',
    'Workplace Strategy': 'Strategic assessment of workplace design, culture, and operational effectiveness. Examines workplace environment, employee engagement, and organizational productivity.'
  };
  
  return descriptions[name] || `Professional assessment framework for ${name}`;
}

// Run the seeding
seedAssessments();
