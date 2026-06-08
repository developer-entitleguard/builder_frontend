import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { OrgVendor } from "@/hooks/useOrgVendors";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, Plus, UserPlus } from "lucide-react";

export interface ContactValue {
  name: string;
  email: string;
  phone: string;
}

interface ContactComboboxProps {
  value: { name?: string | null; email?: string | null; phone?: string | null };
  vendors: OrgVendor[];
  onChange: (contact: ContactValue) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  align?: "start" | "center" | "end";
}

/**
 * Select-or-add contact picker. As the user types it filters the organisation's
 * saved vendors; if no match exists they can add a new contact (name + email)
 * inline. Returns the chosen/created contact via {@link onChange}; the parent
 * decides what to persist (and, per product spec, fires the trade invite).
 */
export const ContactCombobox = ({
  value,
  vendors,
  onChange,
  disabled,
  placeholder = "Select or add a contact…",
  className,
  align = "start",
}: ContactComboboxProps) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"search" | "add">("search");
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const reset = () => {
    setMode("search");
    setQuery("");
    setNewName("");
    setNewEmail("");
  };

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) reset();
  };

  const selectVendor = (vendor: OrgVendor) => {
    onChange({
      name: vendor.name ?? "",
      email: vendor.contact_email ?? "",
      phone: vendor.contact_phone ?? "",
    });
    handleOpenChange(false);
  };

  const startAdd = () => {
    setNewName(query.trim());
    setNewEmail("");
    setMode("add");
  };

  const confirmAdd = () => {
    const name = newName.trim();
    const email = newEmail.trim();
    if (!name && !email) return;
    onChange({ name, email, phone: "" });
    handleOpenChange(false);
  };

  const label = value.name?.trim() || value.email?.trim() || "";

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !label && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{label || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] min-w-[16rem] p-0"
        align={align}
      >
        {mode === "search" ? (
          <Command>
            <CommandInput
              placeholder="Search contacts…"
              value={query}
              onValueChange={setQuery}
            />
            <CommandList>
              <CommandEmpty>
                <button
                  type="button"
                  onClick={startAdd}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                >
                  <Plus className="h-4 w-4" />
                  Add {query.trim() ? `"${query.trim()}"` : "new contact"}
                </button>
              </CommandEmpty>
              {vendors.length > 0 && (
                <CommandGroup heading="Your vendors">
                  {vendors.map((v) => (
                    <CommandItem
                      key={v.id}
                      value={`${v.name} ${v.contact_email}`}
                      onSelect={() => selectVendor(v)}
                    >
                      <div className="flex flex-col">
                        <span>{v.name}</span>
                        {v.contact_email && (
                          <span className="text-xs text-muted-foreground">
                            {v.contact_email}
                          </span>
                        )}
                      </div>
                      {value.email && v.contact_email === value.email && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
            <div className="border-t p-1">
              <button
                type="button"
                onClick={startAdd}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
              >
                <UserPlus className="h-4 w-4" />
                Add new contact
              </button>
            </div>
          </Command>
        ) : (
          <div className="space-y-3 p-3">
            <div>
              <Label className="text-xs text-muted-foreground">Contact name</Label>
              <Input
                className="mt-1 h-8"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Joe's Electrical"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Contact email</Label>
              <Input
                className="mt-1 h-8"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="name@example.com"
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmAdd();
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setMode("search")}
              >
                Back
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={confirmAdd}
                disabled={!newName.trim() && !newEmail.trim()}
              >
                Add
              </Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
