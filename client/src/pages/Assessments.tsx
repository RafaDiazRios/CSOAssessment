import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Plus, ClipboardList, ArrowRight, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function Assessments() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    clientId: "",
    assessmentTypeId: "",
  });

  const { data: assessments, refetch } = trpc.assessments.list.useQuery(undefined, { enabled: !!user });
  const { data: clients } = trpc.clients.list.useQuery(undefined, { enabled: !!user });
  const { data: assessmentTypes } = trpc.assessmentTypes.list.useQuery(undefined, { enabled: !!user });
  
  const createMutation = trpc.assessments.create.useMutation();
  const deleteMutation = trpc.assessments.delete.useMutation();

  const resetForm = () => {
    setFormData({
      title: "",
      clientId: "",
      assessmentTypeId: "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const result = await createMutation.mutateAsync({
        title: formData.title,
        clientId: parseInt(formData.clientId),
        assessmentTypeId: parseInt(formData.assessmentTypeId),
      });
      
      toast.success("Assessment created successfully");
      setIsDialogOpen(false);
      resetForm();
      refetch();
      
      // Navigate to the assessment detail page
      setLocation(`/assessments/${result.id}`);
    } catch (error) {
      toast.error("Failed to create assessment");
    }
  };

  const handleDelete = async (assessmentId: number) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;
    
    try {
      await deleteMutation.mutateAsync({ id: assessmentId });
      toast.success("Assessment deleted successfully");
      refetch();
    } catch (error) {
      toast.error("Failed to delete assessment");
    }
  };

  const getClientName = (clientId: number) => {
    return clients?.find(c => c.id === clientId)?.companyName || "Unknown Client";
  };

  const getAssessmentTypeName = (typeId: number) => {
    return assessmentTypes?.find(t => t.id === typeId)?.name || "Unknown Type";
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage business assessments for your clients
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button disabled={!clients || clients.length === 0}>
                <Plus className="mr-2 h-4 w-4" />
                New Assessment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>Create New Assessment</DialogTitle>
                  <DialogDescription>
                    Select a client and assessment type to begin
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="title">Assessment Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Q4 2024 Business Control Assessment"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="client">Client *</Label>
                    <Select
                      value={formData.clientId}
                      onValueChange={(value) => setFormData({ ...formData, clientId: value })}
                      required
                    >
                      <SelectTrigger id="client">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map((client) => (
                          <SelectItem key={client.id} value={client.id.toString()}>
                            {client.companyName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="assessmentType">Assessment Type *</Label>
                    <Select
                      value={formData.assessmentTypeId}
                      onValueChange={(value) => setFormData({ ...formData, assessmentTypeId: value })}
                      required
                    >
                      <SelectTrigger id="assessmentType">
                        <SelectValue placeholder="Select assessment type" />
                      </SelectTrigger>
                      <SelectContent>
                        {assessmentTypes?.map((type) => (
                          <SelectItem key={type.id} value={type.id.toString()}>
                            <div>
                              <div className="font-medium">{type.name}</div>
                              <div className="text-xs text-muted-foreground">{type.totalQuestions} questions</div>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => {
                    setIsDialogOpen(false);
                    resetForm();
                  }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={!formData.title || !formData.clientId || !formData.assessmentTypeId}>
                    Create Assessment
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Assessments List */}
        {assessments && assessments.length > 0 ? (
          <div className="space-y-4">
            {assessments.map((assessment) => (
              <Card key={assessment.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <ClipboardList className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-xl">{assessment.title}</CardTitle>
                          <CardDescription className="mt-1">
                            {getClientName(assessment.clientId)} • {getAssessmentTypeName(assessment.assessmentTypeId)}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                    <span className={`text-sm px-3 py-1 rounded-full whitespace-nowrap ${
                      assessment.status === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {assessment.status === 'completed' ? 'Completed' : 'In Progress'}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Started: {new Date(assessment.startedAt).toLocaleDateString()}
                      {assessment.completedAt && (
                        <> • Completed: {new Date(assessment.completedAt).toLocaleDateString()}</>
                      )}
                      {assessment.totalScore && (
                        <> • Score: {assessment.totalScore.toFixed(2)}/5</>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(assessment.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setLocation(
                          assessment.status === 'completed' 
                            ? `/results/${assessment.id}`
                            : `/assessments/${assessment.id}`
                        )}
                      >
                        {assessment.status === 'completed' ? 'View Results' : 'Continue'}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No assessments yet</h3>
              <p className="text-muted-foreground text-center mb-6 max-w-md">
                {clients && clients.length > 0
                  ? "Create your first assessment to start evaluating business performance."
                  : "Add a client first before creating assessments."}
              </p>
              {clients && clients.length > 0 ? (
                <Button onClick={() => setIsDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Assessment
                </Button>
              ) : (
                <Button onClick={() => setLocation("/clients")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Client First
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
