import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { BarChart3, FileText, Sparkles, AlertCircle, CheckCircle2, TrendingUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useParams } from "wouter";
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer, Legend } from 'recharts';

export default function Results() {
  const { id } = useParams<{ id: string }>();
  const assessmentId = parseInt(id || "0");
  const { user } = useAuth();
  const [insights, setInsights] = useState<any>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  const { data: assessment } = trpc.assessments.get.useQuery({ id: assessmentId }, { enabled: !!user && assessmentId > 0 });
  const { data: scores } = trpc.analysis.getScores.useQuery({ assessmentId }, { enabled: !!user && assessmentId > 0 });
  const generateInsightsMutation = trpc.analysis.generateInsights.useMutation();

  const handleGenerateInsights = async () => {
    setGeneratingInsights(true);
    try {
      const result = await generateInsightsMutation.mutateAsync({ assessmentId });
      setInsights(result);
      toast.success("AI insights generated successfully");
    } catch (error) {
      toast.error("Failed to generate insights");
    } finally {
      setGeneratingInsights(false);
    }
  };

  if (!assessment || !scores) {
    return (
      <DashboardLayout>
        <div>Loading...</div>
      </DashboardLayout>
    );
  }

  // Prepare data for radar chart
  const chartData = scores.map(score => ({
    criterion: `C${score.criterionNumber}`,
    fullName: score.criterionName,
    score: parseFloat(score.averageScore.toFixed(2)),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assessment Results</h1>
            <p className="text-muted-foreground mt-2">{assessment.title}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled>
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
            <Button onClick={handleGenerateInsights} disabled={generatingInsights}>
              <Sparkles className="mr-2 h-4 w-4" />
              {generatingInsights ? "Generating..." : "Generate AI Insights"}
            </Button>
          </div>
        </div>

        {/* Overall Score */}
        <Card>
          <CardHeader>
            <CardTitle>Overall Score</CardTitle>
            <CardDescription>Average score across all criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-primary">
              {assessment.totalScore?.toFixed(2) || "N/A"} / 5.00
            </div>
          </CardContent>
        </Card>

        {/* Scorecard Visualization */}
        <Card>
          <CardHeader>
            <CardTitle>Scorecard Visualization</CardTitle>
            <CardDescription>Performance across all assessment criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={chartData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="criterion" />
                <PolarRadiusAxis angle={90} domain={[0, 5]} />
                <Radar name="Score" dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Criterion Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Criterion Breakdown</CardTitle>
            <CardDescription>Detailed scores for each criterion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scores.map((score) => (
                <div key={score.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold">
                      Criterion {score.criterionNumber}: {score.criterionName}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {score.answeredQuestions} of {score.totalQuestions} questions answered
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">
                        {score.averageScore.toFixed(2)}
                      </div>
                      <div className="text-xs text-muted-foreground">out of 5</div>
                    </div>
                    {score.averageScore >= 4 ? (
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    ) : score.averageScore >= 3 ? (
                      <TrendingUp className="h-6 w-6 text-yellow-500" />
                    ) : (
                      <AlertCircle className="h-6 w-6 text-red-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        {insights && (
          <>
            {/* Executive Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">{insights.executiveSummary}</p>
              </CardContent>
            </Card>

            {/* Key Strengths */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Key Strengths
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.keyStrengths.map((strength: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
                      <span>{strength}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Critical Gaps */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  Critical Gaps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {insights.criticalGaps.map((gap: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
                      <span>{gap}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {/* Action Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Prioritized Action Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {insights.actionItems.map((item: any, index: number) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="font-semibold">{item.title}</div>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.priority === 'High' ? 'bg-red-100 text-red-800' :
                          item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {item.priority}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{item.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Criterion: {item.criterion}</span>
                        <span>•</span>
                        <span>Impact: {item.estimatedImpact}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Implementation Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Implementation Timeline</CardTitle>
                <CardDescription>Suggested phased approach</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-semibold mb-2 text-red-600">Immediate Actions</h4>
                    <ul className="space-y-1 ml-4">
                      {insights.implementationTimeline.immediate.map((action: string, index: number) => (
                        <li key={index} className="text-sm list-disc">{action}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-yellow-600">Short-Term (1-3 months)</h4>
                    <ul className="space-y-1 ml-4">
                      {insights.implementationTimeline.shortTerm.map((action: string, index: number) => (
                        <li key={index} className="text-sm list-disc">{action}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2 text-green-600">Long-Term (3-12 months)</h4>
                    <ul className="space-y-1 ml-4">
                      {insights.implementationTimeline.longTerm.map((action: string, index: number) => (
                        <li key={index} className="text-sm list-disc">{action}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Call to Action if no insights yet */}
        {!insights && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Generate AI-Powered Insights</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Get detailed analysis, identify strengths and gaps, and receive prioritized action items based on your assessment results.
              </p>
              <Button onClick={handleGenerateInsights} disabled={generatingInsights}>
                <Sparkles className="mr-2 h-4 w-4" />
                {generatingInsights ? "Generating Insights..." : "Generate Insights Now"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
