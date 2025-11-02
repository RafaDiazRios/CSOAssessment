import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { ClipboardList, Users, BarChart3, FileText, Plus, ArrowRight } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { user, loading } = useAuth();
  const { data: clients } = trpc.clients.list.useQuery(undefined, { enabled: !!user });
  const { data: assessments } = trpc.assessments.list.useQuery(undefined, { enabled: !!user });

  if (loading) {
    return <DashboardLayout><div>Loading...</div></DashboardLayout>;
  }

  const completedAssessments = assessments?.filter(a => a.status === 'completed').length || 0;
  const inProgressAssessments = assessments?.filter(a => a.status === 'in_progress').length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome back! Here's an overview of your business assessments.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active business clients
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{assessments?.length || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">
                All assessment instances
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedAssessments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Finished assessments
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">In Progress</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{inProgressAssessments}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Active assessments
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Get started with common tasks</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <Link href="/clients">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <Users className="mr-3 h-5 w-5" />
                <div className="text-left flex-1">
                  <div className="font-semibold">Manage Clients</div>
                  <div className="text-sm text-muted-foreground">Add or edit client information</div>
                </div>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <Link href="/assessments">
              <Button variant="outline" className="w-full justify-start h-auto py-4">
                <Plus className="mr-3 h-5 w-5" />
                <div className="text-left flex-1">
                  <div className="font-semibold">New Assessment</div>
                  <div className="text-sm text-muted-foreground">Start a business assessment</div>
                </div>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Recent Assessments */}
        {assessments && assessments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Assessments</CardTitle>
              <CardDescription>Your latest assessment activities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assessments.slice(0, 5).map((assessment) => (
                  <Link key={assessment.id} href={`/assessments/${assessment.id}`}>
                    <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent transition-colors cursor-pointer">
                      <div className="flex-1">
                        <div className="font-medium">{assessment.title}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {new Date(assessment.startedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm px-3 py-1 rounded-full ${
                          assessment.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {assessment.status === 'completed' ? 'Completed' : 'In Progress'}
                        </span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {(!assessments || assessments.length === 0) && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No assessments yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                Get started by adding a client and creating your first business assessment.
              </p>
              <div className="flex gap-3">
                <Link href="/clients">
                  <Button variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Add Client
                  </Button>
                </Link>
                <Link href="/assessments">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    New Assessment
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
