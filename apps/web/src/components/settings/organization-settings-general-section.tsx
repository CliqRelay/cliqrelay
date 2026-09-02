import { useForm } from "@tanstack/react-form";

import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authulaClient } from "@/lib/authula-client";
import { toast } from "@/lib/toast";
import { useOrgStore } from "@/stores";
import { getCsrfTokenHeader } from "@/utils/http.utils";

const formSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required"),
  slug: z.string().trim().optional(),
});
type FormSchema = z.infer<typeof formSchema>;

function FieldInfo({ field }: { field: any }) {
  if (!field.state.meta.isTouched || field.state.meta.errors.length === 0) {
    return null;
  }
  return (
    <p className="mt-1 text-sm text-destructive">
      {field.state.meta.errors
        .map((e: any) => (typeof e === "string" ? e : (e.message ?? e)))
        .join(", ")}
    </p>
  );
}

export function OrganizationSettingsGeneralSection() {
  const orgId = useOrgStore((state) => state.orgId);
  const orgName = useOrgStore((state) => state.orgName);
  const organizations = useOrgStore((state) => state.organizations);
  const currentMember = useOrgStore((state) => state.currentMember);
  const setOrg = useOrgStore((state) => state.setOrg);
  const setOrganizations = useOrgStore((state) => state.setOrganizations);

  const { mutateAsync: updateOrganization } = authulaClient.organizations.useUpdateOrganization({
    request: {
      credentials: "include",
      headers: {
        ...getCsrfTokenHeader(),
      },
    },
  });

  const form = useForm({
    validators: {
      onChange: formSchema,
    },
    defaultValues: {
      name: orgName ?? "",
      slug: organizations.find((o) => o.id === orgId)?.slug ?? "",
    } satisfies FormSchema,
    onSubmit: async ({ value }) => {
      try {
        if (!orgId) {
          return;
        }
        const updatedOrg = await updateOrganization({
          organizationId: orgId,
          data: {
            name: value.name,
            slug: value.slug || undefined,
          },
        });
        setOrg(orgId, value.name, updatedOrg?.ownerId ?? "");
        setOrganizations(
          organizations.map((o) =>
            o.id === orgId ? { ...o, name: value.name, slug: updatedOrg?.slug ?? value.slug } : o,
          ),
        );
        form.reset({ name: value.name, slug: updatedOrg?.slug ?? value.slug });
        toast.success("Organization settings updated");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update organization");
      }
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">General</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your organization's basic settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization Name</CardTitle>
          <CardDescription>This is the name displayed across your organization</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <form.Field
              name="name"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor="org-name">Name</Label>
                  <Input
                    id="org-name"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="My Organization"
                    className="w-full"
                    disabled={currentMember?.role !== "admin"}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Field
              name="slug"
              children={(field) => (
                <div className="space-y-2">
                  <Label htmlFor="org-slug">Slug</Label>
                  <Input
                    id="org-slug"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    onBlur={field.handleBlur}
                    placeholder="my-organization"
                    className="w-full"
                    disabled={currentMember?.role !== "admin"}
                  />
                  <FieldInfo field={field} />
                </div>
              )}
            />
            <form.Subscribe
              selector={(state) => ({
                values: state.values,
                isSubmitting: state.isSubmitting,
              })}
              children={({ values, isSubmitting }) => {
                const hasChanges =
                  values.name !== form.options.defaultValues?.name ||
                  values.slug !== form.options.defaultValues?.slug;
                return (
                  <Button type="submit" disabled={!hasChanges || isSubmitting}>
                    {isSubmitting ? "Saving..." : "Save"}
                  </Button>
                );
              }}
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
