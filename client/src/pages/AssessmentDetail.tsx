import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Save, ArrowRight } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useLocation, useParams } from "wouter";

export default function AssessmentDetail() {
  const { id } = useParams<{ id: string }>();
  const assessmentId = parseInt(id || "0");
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [answers, setAnswers] = useState<Record<number, { score: number | null, notes: string }>>({});
  const [activeTab, setActiveTab] = useState("1");

  const { data: assessment } = trpc.assessments.get.useQuery({ id: assessmentId }, { enabled: !!user && assessmentId > 0 });
  const { data: questions } = trpc.assessmentTypes.getQuestions.useQuery(
    { assessmentTypeId: assessment?.assessmentTypeId || 0 },
    { enabled: !!assessment }
  );
  const { data: existingAnswers } = trpc.answers.list.useQuery({ assessmentId }, { enabled: !!user && assessmentId > 0 });
  const { data: progress } = trpc.assessments.getProgress.useQuery({ assessmentId }, { enabled: !!user && assessmentId > 0 });

  const saveAnswerMutation = trpc.answers.save.useMutation();
  const completeMutation = trpc.assessments.complete.useMutation();

  // Load existing answers
  useEffect(() => {
    if (existingAnswers) {
      const answerMap: Record<number, { score: number | null, notes: string }> = {};
      existingAnswers.forEach(answer => {
        answerMap[answer.questionId] = {
          score: answer.score,
          notes: answer.notes || "",
        };
      });
      setAnswers(answerMap);
    }
  }, [existingAnswers]);

  const handleScoreChange = async (questionId: number, score: number | null) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], score },
    }));

    try {
      await saveAnswerMutation.mutateAsync({
        assessmentId,
        questionId,
        score,
        notes: answers[questionId]?.notes || "",
      });
    } catch (error) {
      toast.error("Failed to save answer");
    }
  };

  const handleNotesChange = (questionId: number, notes: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { ...prev[questionId], notes },
    }));
  };

  const handleNotesBlur = async (questionId: number) => {
    try {
      await saveAnswerMutation.mutateAsync({
        assessmentId,
        questionId,
        score: answers[questionId]?.score || null,
        notes: answers[questionId]?.notes || "",
      });
    } catch (error) {
      toast.error("Failed to save notes");
    }
  };

  const handleComplete = async () => {
    if (!progress || progress.answeredQuestions < progress.totalQuestions * 0.5) {
      toast.error("Please answer at least 50% of questions before completing");
      return;
    }

    if (!confirm("Are you sure you want to complete this assessment? You can still edit answers later.")) {
      return;
    }

    try {
      await completeMutation.mutateAsync({ assessmentId });
      toast.success("Assessment completed successfully!");
      setLocation(`/results/${assessmentId}`);
    } catch (error) {
      toast.error("Failed to complete assessment");
    }
  };

  if (!assessment || !questions) {
    return (
      <DashboardLayout>
        <div>Loading...</div>
      </DashboardLayout>
    );
  }

  // Group questions by criterion
  const questionsByCriterion = questions.reduce((acc, q) => {
    if (!acc[q.criterionNumber]) {
      acc[q.criterionNumber] = {
        name: q.criterionName,
        questions: [],
      };
    }
    acc[q.criterionNumber].questions.push(q);
    return acc;
  }, {} as Record<number, { name: string, questions: typeof questions }>);

  const criterionNumbers = Object.keys(questionsByCriterion).sort((a, b) => parseInt(a) - parseInt(b));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{assessment.title}</h1>
          <p className="text-muted-foreground mt-2">
            Answer the questions below using the 1-5 scale
          </p>
        </div>

        {/* Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Progress</CardTitle>
                <CardDescription>
                  {progress?.answeredQuestions || 0} of {progress?.totalQuestions || 0} questions answered
                </CardDescription>
              </div>
              <Button onClick={handleComplete} disabled={completeMutation.isPending}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Complete Assessment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={progress?.progress || 0} className="h-2" />
          </CardContent>
        </Card>

        {/* Questions by Criterion */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${criterionNumbers.length}, 1fr)` }}>
            {criterionNumbers.map((num) => (
              <TabsTrigger key={num} value={num}>
                {questionsByCriterion[parseInt(num)].name}
              </TabsTrigger>
            ))}
          </TabsList>

          {criterionNumbers.map((num) => {
            const criterion = questionsByCriterion[parseInt(num)];
            return (
              <TabsContent key={num} value={num} className="space-y-4 mt-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-semibold">Criterion {num}: {criterion.name}</h2>
                  <p className="text-muted-foreground mt-2">
                    {criterion.questions.length} questions
                  </p>
                </div>

                {criterion.questions.map((question) => (
                  <Card key={question.id}>
                    <CardHeader>
                      <CardTitle className="text-base font-medium">
                        {question.questionNumber}. {question.questionText}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label className="text-sm text-muted-foreground mb-3 block">
                          Rate your answer (1 = Strongly Disagree, 5 = Strongly Agree)
                        </Label>
                        <RadioGroup
                          value={answers[question.id]?.score?.toString() || ""}
                          onValueChange={(value) => handleScoreChange(question.id, parseInt(value))}
                        >
                          <div className="flex gap-6">
                            {[1, 2, 3, 4, 5].map((score) => (
                              <div key={score} className="flex items-center space-x-2">
                                <RadioGroupItem value={score.toString()} id={`q${question.id}-${score}`} />
                                <Label htmlFor={`q${question.id}-${score}`} className="cursor-pointer">
                                  {score}
                                </Label>
                              </div>
                            ))}
                          </div>
                        </RadioGroup>
                      </div>

                      <div>
                        <Label htmlFor={`notes-${question.id}`} className="text-sm">
                          Notes (optional)
                        </Label>
                        <Textarea
                          id={`notes-${question.id}`}
                          placeholder="Add any additional notes or context..."
                          value={answers[question.id]?.notes || ""}
                          onChange={(e) => handleNotesChange(question.id, e.target.value)}
                          onBlur={() => handleNotesBlur(question.id)}
                          rows={2}
                          className="mt-2"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}

                <div className="flex justify-end gap-2 pt-4">
                  {parseInt(num) < criterionNumbers.length && (
                    <Button onClick={() => setActiveTab((parseInt(num) + 1).toString())}>
                      Next Criterion
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
