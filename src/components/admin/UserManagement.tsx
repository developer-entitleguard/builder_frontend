import { useState, useEffect } from "react";
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
import { useAuth } from "@/hooks/useAuth";
import { useGetBuilderUsersQuery, useCreateOrUpdateBuilderUserMutation, useDeleteBuilderUserMutation } from "@/lib/api/services/builderUsers";
import { validateEmail, validatePhone } from "@/utils/validation";
import { Users, UserPlus, Edit, Trash2, Mail, Phone, User, Shield } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const userSchema = z.object({
  email: z.string().refine((email) => validateEmail(email), {
    message: "Please enter a valid email address",
  }),
  contact_person: z.string().min(1, "Contact person is required"),
  phone: z.string().optional().refine((phone) => !phone || validatePhone(phone), {
    message: "Please enter a valid Australian phone number",
  }),
  role: z.enum(['admin', 'user']),
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
  role: string;
  created_at: string;
}

export function UserManagement({ organizationId }: UserManagementProps) {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  // Get builderId from user (organization ID)
  const builderId = user && 'builderOrganization' in user && user.builderOrganization
    ? user.builderOrganization.id
    : user && 'id' in user 
    ? user.id 
    : organizationId || null;

  // Fetch users from API
  const { 
    data: apiResponse, 
    isLoading: loading, 
    error: apiError,
    refetch: refetchUsers
  } = useGetBuilderUsersQuery(
    { builderId: builderId || '' },
    { skip: !builderId }
  );

  // Mutations
  const [createOrUpdateUser, { isLoading: isUpdating }] = useCreateOrUpdateBuilderUserMutation();
  const [deleteUser, { isLoading: isDeleting }] = useDeleteBuilderUserMutation();

  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      role: "user",
      contact_person: "",
      phone: "",
    },
  });

  // Map API response to component format
  useEffect(() => {
    if (apiResponse?.data) {
      const mappedUsers: User[] = apiResponse.data.map((apiUser) => {
        const fullName = apiUser.lastName 
          ? `${apiUser.firstName} ${apiUser.lastName}`
          : apiUser.firstName;
        
        return {
          id: apiUser.id,
          email: apiUser.email,
          company_name: apiUser.builderOrganization?.name || 'Organization',
          contact_person: fullName,
          phone: apiUser.contact || '',
          role: apiUser.role,
          created_at: new Date().toISOString(), // API doesn't provide created_at, using current date
        };
      });
      setUsers(mappedUsers);
    } else if (apiError) {
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  }, [apiResponse, apiError, toast]);

  const onSubmit = async (data: UserFormData) => {
    if (!builderId) {
      toast({
        title: "Error",
        description: "Organization ID is missing",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      // Split contact_person into firstName and lastName
      const nameParts = data.contact_person.trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || undefined;

      if (editingUser) {
        // Update existing user
        await createOrUpdateUser({
          id: editingUser.id,
          email: data.email,
          firstName,
          lastName,
          contact: data.phone || undefined,
          role: data.role,
          builderOrganizationId: builderId,
        }).unwrap();

        toast({
          title: "Success",
          description: "User updated successfully",
        });
      } else {
        // Create new user
        await createOrUpdateUser({
          email: data.email,
          firstName,
          lastName,
          contact: data.phone || undefined,
          role: data.role,
          builderOrganizationId: builderId,
        }).unwrap();

        toast({
          title: "Success",
          description: "User added successfully",
        });
      }

      setIsAddDialogOpen(false);
      setEditingUser(null);
      form.reset();
      refetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      const errorMessage = error && typeof error === 'object' && 'data' in error 
        ? (error.data as { message?: string })?.message 
        : undefined;
      toast({
        title: "Error",
        description: errorMessage || "Failed to save user",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    form.reset({
      email: user.email,
      contact_person: user.contact_person || "",
      phone: user.phone || "",
      role: user.role as 'admin' | 'user',
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = async (userId: string) => {
    try {
      await deleteUser(userId).unwrap();

      toast({
        title: "Success",
        description: "User removed from organization",
      });
      refetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      const errorMessage = error && typeof error === 'object' && 'data' in error 
        ? (error.data as { message?: string })?.message 
        : undefined;
      toast({
        title: "Error",
        description: errorMessage || "Failed to remove user",
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
      role: "user",
    });
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
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
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

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || isUpdating}>
                    {(submitting || isUpdating) ? (editingUser ? 'Updating...' : 'Adding...') : (editingUser ? 'Update User' : 'Add User')}
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
                      {user.role}
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