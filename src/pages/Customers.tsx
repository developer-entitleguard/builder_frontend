import { useState } from "react";
import { Plus } from "lucide-react";
import { SalesShell } from "@/components/sales/SalesShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  useGetCustomersQuery,
  useCreateCustomerMutation,
  useUpdateCustomerMutation,
  type SalesCustomerDto,
  type SalesCustomerWriteRequest,
  type SalesCustomerType,
} from "@/store/api";

const emptyForm: SalesCustomerWriteRequest & { customerType: SalesCustomerType } = {
  customerType: "INDIVIDUAL",
  name: "",
  abn: "",
  email: "",
  phone: "",
  addressLine: "",
  city: "",
  state: "",
  zip: "",
  notes: "",
};

const toForm = (c: SalesCustomerDto): typeof emptyForm => ({
  customerType: c.customerType,
  name: c.name,
  abn: c.abn ?? "",
  email: c.email ?? "",
  phone: c.phone ?? "",
  addressLine: c.addressLine ?? "",
  city: c.city ?? "",
  state: c.state ?? "",
  zip: c.zip ?? "",
  notes: c.notes ?? "",
});

const Customers = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const { data: customers, isLoading } = useGetCustomersQuery(search ? { q: search } : undefined);
  const [createCustomer, { isLoading: creating }] = useCreateCustomerMutation();
  const [updateCustomer, { isLoading: updating }] = useUpdateCustomerMutation();

  const [editing, setEditing] = useState<SalesCustomerDto | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const openEdit = (c: SalesCustomerDto) => {
    setEditing(c);
    setForm(toForm(c));
    setOpen(true);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editing) {
        await updateCustomer({ id: editing.id, body: form }).unwrap();
        toast({ title: "Customer updated", description: form.name });
      } else {
        await createCustomer(form).unwrap();
        toast({ title: "Customer added", description: form.name });
      }
      setOpen(false);
    } catch (err) {
      toast({
        variant: "destructive",
        title: editing ? "Update failed" : "Create failed",
        description: err instanceof Error ? err.message : "Something went wrong",
      });
    }
  };

  const rows = customers ?? [];

  return (
    <SalesShell>
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h1 className="text-3xl font-bold text-foreground">Customers</h1>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add customer
          </Button>
        </div>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle>Customer directory</CardTitle>
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
            ) : rows.length === 0 ? (
              <div className="text-sm text-muted-foreground py-8 text-center">
                No customers yet. Click <strong>Add customer</strong> to create your first one.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Location</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" onClick={() => openEdit(c)}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{c.customerType}</Badge>
                      </TableCell>
                      <TableCell>{c.email || "—"}</TableCell>
                      <TableCell>{c.phone || "—"}</TableCell>
                      <TableCell>{[c.city, c.state].filter(Boolean).join(", ") || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle>
            <DialogDescription>
              Customers can be selected when raising quotes and invoices.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select
                  value={form.customerType}
                  onValueChange={(v) => setForm({ ...form, customerType: v as SalesCustomerType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="BUSINESS">Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
            </div>
            {form.customerType === "BUSINESS" && (
              <div className="grid gap-2">
                <Label htmlFor="abn">ABN</Label>
                <Input id="abn" value={form.abn} onChange={(e) => setForm({ ...form, abn: e.target.value })} />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="addressLine">Address</Label>
              <Input
                id="addressLine"
                value={form.addressLine}
                onChange={(e) => setForm({ ...form, addressLine: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="zip">Postcode</Label>
                <Input id="zip" value={form.zip} onChange={(e) => setForm({ ...form, zip: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating || updating}>
                {creating || updating ? "Saving…" : editing ? "Save changes" : "Add customer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </SalesShell>
  );
};

export default Customers;
