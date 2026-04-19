import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { validateEmail, validatePhone } from "@/utils/validation";
import { Users, UserPlus, Edit, Trash2, Mail, Phone, User, Shield } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import {
  useGetBuilderUsersQuery,
  useCreateOrUpdateBuilderUserMutation,
  useDeleteBuilderUserMutation,
} from "@/store/api";
import {
  BUILDER_ROLES,
  BUILDER_ROLE_LABELS,
  type BuilderRole,
  isAdministrator,
  normalizeBuilderRole,
} from "@/lib/roles";

// Vendor roles (INTERNAL_VENDOR / EXTERNAL_VENDOR) are intentionally excluded —
// vendors are created and managed under the Vendors tab. Internal vendors get
// their login auto-provisioned there; external vendors don't need a login.
const BUILDER_ROLE_VALUES = [
  BUILDER_ROLES.ADMINISTRATOR,
  BUILDER_ROLES.PROJECT_MANAGER,
  BUILDER_ROLES.CUSTOMER_SUPPORT,
] as const;

const userSchema = z.object({
  email: z.string().refine((email) => validateEmail(email), {
    message: "Please enter a valid email address",
  }),
  contact_person: z.string().min(1, "Contact person is required"),
  phone: z.string().optional().refine((phone) => !phone || validatePhone(phone), {
    message: "Please enter a valid Australian phone number",
  }),
  role: z.enum(BUILDER_ROLE_VALUES),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserManagementProps {
  organizationId?: string;
}

interface User {
  id: string;
  email: string;
  company_name?: string;
  contact_person?: string;
  phone?: string;
  role: BuilderRole;
  created_at: string;
}

export function UserManagement({ organizationId }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { toast } = useToast();

  const builderId = organizationId;

  const {
    data: builderUsersResponse,
    isLoading: loading,
    refetch: refetchUsers,
  } = useGetBuilderUsersQuery(
    { builderId: builderId || "" },
    { skip: !builderId }
  );

  const [createOrUpdateBuilderUser, { isLoading: submitting }] =
    useCreateOrUpdateBuilderUserMutation();
  const [deleteBuilderUser, { isLoading: deleting }] =
    useDeleteBuilderUserMutation();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      role: BUILDER_ROLES.PROJECT_MANAGER,
      contact_person: "",
      phone: "",
    },
  });

  useEffect(() => {
    const list = builderUsersResponse?.data ?? [];
    // Vendor-role accounts (INTERNAL_VENDOR / EXTERNAL_VENDOR) are managed in
    // the Vendors tab — hide them here so the User Management list stays focused
    // on the people that this screen can actually create or edit.
    const mapped: User[] = list
      .map((u) => {
        const canonical = normalizeBuilderRole(u.role) ?? BUILDER_ROLES.PROJECT_MANAGER;
        return {
          id: u.id,
          email: u.email,
          company_name: u.builderOrganization?.name,
          contact_person: `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() || "Team Member",
          phone: u.contact ?? "",
          role: canonical,
          // API doesn't provide createdAt for users; keep UI stable with a valid date
          created_at: new Date().toISOString(),
        };
      })
      .filter(
        (u) =>
          u.role !== BUILDER_ROLES.INTERNAL_VENDOR &&
          u.role !== BUILDER_ROLES.EXTERNAL_VENDOR
      );
    setUsers(mapped);
  }, [builderUsersResponse?.data]);

  const onSubmit = async (data: UserFormData) => {
    try {
      if (!builderId) throw new Error("Missing organization id.");

      // API expects firstName/lastName/contact; UI collects full name + phone
      const nameParts = (data.contact_person || "").trim().split(/\s+/);
      const firstName = nameParts.shift() || data.contact_person;
      const lastName = nameParts.join(" ") || "";

      await createOrUpdateBuilderUser({
        ...(editingUser ? { id: editingUser.id } : {}),
        email: data.email,
        firstName,
        lastName,
        contact: data.phone || "",
        role: data.role,
        vendorType: null,
        specializations: "",
        builderOrganizationId: builderId,
      }).unwrap();

      toast({
        title: "Success",
        description: editingUser ? "User updated successfully" : "User added successfully",
      });

      setIsAddDialogOpen(false);
      setEditingUser(null);
      form.reset();
      refetchUsers();
    } catch (error: unknown) {
      console.error('Error saving user:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save user",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      email: user.email,
      contact_person: user.contact_person || "",
      phone: user.phone || "",
      role: user.role,
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (userId: string) => {
    try {
      await deleteBuilderUser(userId).unwrap();

      toast({
        title: "Success",
        description: "User removed from organization",
      });
      refetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast({
        title: "Error",
        description: "Failed to remove user",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    form.reset({
      email: "",
      contact_person: "",
      phone: "",
      role: BUILDER_ROLES.PROJECT_MANAGER,
    });
  };

  const getRoleIcon = (role: BuilderRole) => {
    return isAdministrator(role) ? (
      <Shield className="h-4 w-4" />
    ) : (
      <User className="h-4 w-4" />
    );
  };

  const getRoleBadgeVariant = (role: BuilderRole) => {
    return isAdministrator(role) ? "default" : "secondary";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Team Members ({users.length})</h3>
        </div>
        
        <Dialog 
          open={isAddDialogOpen} 
          onOpenChange={(open) => {
            setIsAddDialogOpen(open);
            if (!open) resetForm();
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingUser ? 'Edit User' : 'Add New User'}
              </DialogTitle>
              <DialogDescription>
                {editingUser 
                  ? 'Update user information and role within your organization.'
                  : 'Add a new team member to your organization.'
                }
              </DialogDescription>
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
                        <Input 
                          {...field} 
                          type="email" 
                          disabled={!!editingUser}
                          placeholder="user@company.com"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contact_person"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="John Smith" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BUILDER_ROLE_VALUES.map((role) => (
                              <SelectItem key={role} value={role}>
                                {BUILDER_ROLE_LABELS[role]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

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

                <p className="text-xs text-muted-foreground">
                  Need to add a vendor? Internal and external vendors are managed under
                  <strong> Vendors</strong> — internal vendors get their login auto-provisioned there.
                </p>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (editingUser ? 'Updating...' : 'Adding...') : (editingUser ? 'Update User' : 'Add User')}
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
          <p>No team members found</p>
          <p className="text-sm">Add your first team member to get started</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <div className="font-medium">{user.contact_person}</div>
                        <div className="text-sm text-muted-foreground">{user.company_name}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3 text-muted-foreground" />
                        {user.email}
                      </div>
                      {user.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {user.phone}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getRoleBadgeVariant(user.role)}
                      className="flex items-center gap-1 w-fit"
                    >
                      {getRoleIcon(user.role)}
                      {BUILDER_ROLE_LABELS[user.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(user)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove User</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {user.contact_person} from your organization? 
                              This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(user.id)}>
                              Remove User
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
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