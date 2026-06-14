import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { SalesShell } from "@/components/sales/SalesShell";
import { Button } from "@/components/ui/button";
import { QuoteForm } from "@/components/sales/QuoteForm";
import { useToast } from "@/hooks/use-toast";
import { useUpsertQuoteMutation, type QuoteDto } from "@/store/api";

const QuoteCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [upsert, { isLoading }] = useUpsertQuoteMutation();

  const onSubmit = async (dto: QuoteDto) => {
    try {
      const saved = await upsert(dto).unwrap();
      toast({ title: "Quote created", description: saved.quoteNumber });
      if (saved.id) navigate(`/quotes/${saved.id}`);
      else navigate("/quotes");
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  return (
    <SalesShell>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/quotes")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold">New quote</h1>
        </div>
        <QuoteForm onSubmit={onSubmit} submitting={isLoading} submitLabel="Create quote" />
      </div>
    </SalesShell>
  );
};

export default QuoteCreate;
