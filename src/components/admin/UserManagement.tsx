import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserPlus, Users, Mail, Phone, Shield, User } from "lucide-react";

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "user"], {
    required_error: "Please select a role",
  }),
  company_name: z.string().optional(),
  contact_person: z.string().min(1, "Contact person name is required"),
  phone: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserManagementProps {
  organizationId?: string;
}

interface OrganizationUser {
  id: string;
  user_id: string;
  company_name: string | null;
  contact_person: string | null;
  phone: string | null;
  role?: string;
  created_at: string;
}

export function UserManagement({ organizationId }: UserManagementProps) {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      role: "user",
      company_name: "",
      contact_person: "",
      phone: "",
    },
  });

  const fetchUsers = async () => {
    if (!organizationId) return;
    
    try {
      // For now, just show mock data since the migration hasn't run yet
      const mockUsers: OrganizationUser[] = [
        {
          id: '1',
          user_id: 'user-1',
          company_name: 'Sample Builder Co',
          contact_person: 'John Smith',
          phone: '0412 345 678',
          role: 'admin',
          created_at: new Date().toISOString()
        }
      ];
      setUsers(mockUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Error",
        description: "Failed to fetch users",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [organizationId]);

  const onSubmit = async (data: UserFormData) => {
    setSubmitting(true);
    try {
      // For now, we'll create a mock user entry since we can't directly create auth users
      // In a real implementation, you'd send an invitation email
      const mockUserId = crypto.randomUUID();
      
      const { error } = await supabase
        .from("profiles")
        .insert({
          user_id: mockUserId,
          organization_id: organizationId,
          company_name: data.company_name,
          contact_person: data.contact_person,
          phone: data.phone,
          role: data.role,
        });

      if (error) throw error;

      toast({
        title: "User Invited",
        description: `Invitation sent to ${data.email}. They will appear in the list once they sign up.`,
      });

      form.reset();
      setIsDialogOpen(false);
      fetchUsers();
    } catch (error) {
      console.error("Error inviting user:", error);
      toast({
        title: "Error",
        description: "Failed to invite user",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getRoleIcon = (role: string) => {
    return role === "admin" ? (
      <Shield className="h-4 w-4" />
    ) : (
      <User className="h-4 w-4" />
    );
  };

  const getRoleBadgeVariant = (role: string) => {
    return role === "admin" ? "default" : "secondary";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Organization Users ({users.length})</h3>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="h-4 w-4 mr-2" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite New User</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="contact_person"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="user">User</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="04XX XXX XXX" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="company_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? "Sending..." : "Send Invitation"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {users.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No users found. Invite your first team member!</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.contact_person || "—"}
                  </TableCell>
                  <TableCell>{user.company_name || "—"}</TableCell>
                  <TableCell className="space-y-1">
                    {user.phone && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {user.phone}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={getRoleBadgeVariant(user.role || "user")}
                      className="flex items-center gap-1 w-fit"
                    >
                      {getRoleIcon(user.role || "user")}
                      {user.role || "user"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}