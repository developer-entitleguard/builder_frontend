import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOrganization } from "@/hooks/useOrganization";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, ArrowLeft, Loader2, Paperclip, X } from "lucide-react";
import Header from "@/components/Header";
import {
  useDashboardRegistrationsQuery,
  useCreateBuilderQueryMutation,
  useUpdateQueryMutation,
  useLazyGetRegistrationItemsQuery,
} from "@/store/api";

interface RegistrationOption {
  id: string;
  firstName: string;
  lastName: string;
  projectName?: string;
  email?: string;
}

const CreateQuery = () => {
  const { organization } = useOrganization();
  const { toast } = useToast();
  const navigate = useNavigate();

  const builderId = useMemo(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.userInfo?.builderOrganization?.id)
          return parsed.userInfo.builderOrganization.id;
        if (parsed.builderOrganization?.id)
          return parsed.builderOrganization.id;
      } catch {
        // ignore
      }
    }
    return organization?.id ?? null;
  }, [organization?.id]);

  const userId = useMemo(() => {
    const userData = localStorage.getItem("userData");
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        return parsed.userInfo?.id ?? parsed.id ?? null;
      } catch {
        return null;
      }
    }
    return null;
  }, []);

  // Form state
  const [selectedRegistrationId, setSelectedRegistrationId] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priorityLevel, setPriorityLevel] = useState("");
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // API hooks
  const { data: registrationsData, isLoading: isLoadingRegistrations } =
    useDashboardRegistrationsQuery(
      { builderId: builderId ?? "", type: "owner" },
      { skip: !builderId }
    );

  const [triggerGetItems, { data: itemsData, isFetching: isLoadingItems }] =
    useLazyGetRegistrationItemsQuery();

  const [createQuery, { isLoading: isSubmitting }] =
    useCreateBuilderQueryMutation();
  const [updateQuery] = useUpdateQueryMutation();

  const registrations: RegistrationOption[] = useMemo(() => {
    if (!registrationsData?.data) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (registrationsData.data as any[])
      .filter((r) => {
        const status = (r.statusName ?? "").toUpperCase();
        return status === "SENT" || status === "HANDED";
      })
      .map((r) => ({
        id: r.id,
        firstName: r.firstName ?? "",
        lastName: r.lastName ?? "",
        projectName: r.projectName,
        email: r.email,
      }));
  }, [registrationsData]);

  const items = itemsData?.data ?? [];

  const handleRegistrationChange = (value: string) => {
    setSelectedRegistrationId(value);
    setSelectedItemId("");
    if (value) {
      triggerGetItems({ builderCustomerId: value });
    }
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!selectedRegistrationId)
      newErrors.registration = "Please select a registration";
    if (!title.trim()) newErrors.title = "Title is required";
    if (!description.trim()) newErrors.description = "Description is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileSelect = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*,.pdf";
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        const fileArray = Array.from(files);
        if (attachedFiles.length + fileArray.length > 5) {
          toast({
            title: "Error",
            description: "Maximum 5 files allowed.",
            variant: "destructive",
          });
          return;
        }
        const oversized = fileArray.filter((f) => f.size > 10 * 1024 * 1024);
        if (oversized.length > 0) {
          toast({
            title: "Error",
            description: `Files exceed 10MB limit: ${oversized.map((f) => f.name).join(", ")}`,
            variant: "destructive",
          });
          return;
        }
        setAttachedFiles((prev) => [...prev, ...fileArray]);
      }
    };
    input.click();
  };

  const removeFile = (index: number) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      const result = await createQuery({
        builderCustomerId: selectedRegistrationId,
        builderCustomerItemMapId: selectedItemId && selectedItemId !== "none" ? selectedItemId : undefined,
        title: title.trim(),
        description: description.trim(),
        priorityLevel: priorityLevel || undefined,
        dueDate: dueDate ? dueDate.toISOString().split("T")[0] : undefined,
        userId: userId ?? undefined,
      }).unwrap();

      if (result.success) {
        // If files were attached, upload them via updateQuery
        const queryId = result.data?.queryId;
        if (queryId && attachedFiles.length > 0) {
          try {
            await updateQuery({
              id: queryId,
              queryFileMapDto: attachedFiles.map((file) => ({
                type: "query",
                files: file,
              })),
            }).unwrap();
          } catch {
            toast({
              title: "Query Created",
              description:
                "Query created but file upload failed. You can attach files later.",
            });
            navigate("/queries");
            return;
          }
        }

        toast({
          title: "Query Created",
          description: "The query has been created successfully.",
        });
        navigate("/queries");
      } else {
        toast({
          title: "Error",
          description: result.message || "Failed to create query",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/queries")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Queries
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Create Query</h1>
          <p className="text-muted-foreground mt-1">
            Raise a new query for a registration
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Query Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Registration selector */}
            <div className="space-y-2">
              <Label htmlFor="registration">
                Registration <span className="text-destructive">*</span>
              </Label>
              <Select
                value={selectedRegistrationId}
                onValueChange={handleRegistrationChange}
              >
                <SelectTrigger id="registration">
                  <SelectValue placeholder="Select a registration" />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingRegistrations ? (
                    <SelectItem value="loading" disabled>
                      Loading registrations...
                    </SelectItem>
                  ) : registrations.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No registrations found
                    </SelectItem>
                  ) : (
                    registrations.map((reg) => (
                      <SelectItem key={reg.id} value={reg.id}>
                        {reg.firstName} {reg.lastName}
                        {reg.projectName ? ` - ${reg.projectName}` : ""}
                        {reg.email ? ` (${reg.email})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.registration && (
                <p className="text-sm text-destructive">{errors.registration}</p>
              )}
            </div>

            {/* Item selector (optional) */}
            {selectedRegistrationId && (
              <div className="space-y-2">
                <Label htmlFor="item">Item (Optional)</Label>
                <Select
                  value={selectedItemId}
                  onValueChange={setSelectedItemId}
                >
                  <SelectTrigger id="item">
                    <SelectValue placeholder="Select an item (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {isLoadingItems ? (
                      <SelectItem value="loading" disabled>
                        Loading items...
                      </SelectItem>
                    ) : (
                      <>
                        <SelectItem value="none">
                          None (General Query)
                        </SelectItem>
                        {items.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                            {item.brand ? ` - ${item.brand}` : ""}
                            {item.category ? ` (${item.category})` : ""}
                          </SelectItem>
                        ))}
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                id="title"
                placeholder="Enter query title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title}</p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the query in detail"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
              />
              {errors.description && (
                <p className="text-sm text-destructive">
                  {errors.description}
                </p>
              )}
            </div>

            {/* Priority Level */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority Level</Label>
              <Select value={priorityLevel} onValueChange={setPriorityLevel}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="Select priority (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Low</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Due Date */}
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate
                      ? dueDate.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })
                      : "Select a due date (optional)"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={(date) => {
                      setDueDate(date);
                      setCalendarOpen(false);
                    }}
                    disabled={(date) => date < new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* File Attachments */}
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="space-y-3">
                {attachedFiles.length > 0 && (
                  <div className="space-y-2">
                    {attachedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 rounded-md border bg-muted/50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="text-sm truncate">{file.name}</span>
                          <span className="text-xs text-muted-foreground shrink-0">
                            ({(file.size / 1024).toFixed(0)} KB)
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFileSelect}
                  disabled={attachedFiles.length >= 5}
                >
                  <Paperclip className="h-4 w-4 mr-2" />
                  {attachedFiles.length > 0
                    ? `Add More (${attachedFiles.length}/5)`
                    : "Attach Files"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Images and PDFs accepted. Max 5 files, 10MB each.
                </p>
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => navigate("/queries")}
              >
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Create Query
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateQuery;
