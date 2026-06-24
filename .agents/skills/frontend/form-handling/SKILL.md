---
name: form-handling
description: Build forms using TanStack Form with Zod — `formOptions`, `useForm` with `validators`, render-prop `form.Field`, and try/catch submission with toast errors
---

# Form Handling

> This skill covers `@tanstack/react-form`.

Every form follows a consistent pattern:

1. **Schema** — Define a Zod schema for validation
2. **Options** — Create shared form options with `formOptions()`
3. **Form** — Set up `useForm` with `validators`
4. **Fields** — Use `form.Field` with render prop + `FieldInfo` for errors
5. **Submit** — Handle submission wrapped in `try/catch` with toast feedback

---

## Zod Schema + Type Inference

Define the schema and infer the TypeScript type:

```typescript
import { z } from "zod";

const formSchema = z.object({
  email: z.string().trim().email(),
  password: z
    .string()
    .trim()
    .min(8, "Must be at least 8 characters")
    .max(32, "Must be at most 32 characters")
});
type FormSchema = z.infer<typeof formSchema>;
```

**Rules:**
- Schema and type are co-located in the component file (not extracted)
- Use `z.infer<typeof formSchema>` — never write the type manually
- Use `.trim()` on all string fields
- Provide user-facing error messages in `.min()`, `.max()`, etc.

---

## Shared Form Options with `formOptions`

When the same form config is reused across multiple locations, create shared options with `formOptions()`:

```typescript
import { formOptions } from "@tanstack/react-form";

export const loginFormOptions = formOptions({
  defaultValues: {
    email: "",
    password: ""
  },
  validators: {
    onChange: formSchema
  }
});
```

For single-use forms, inline the config directly in `useForm`.

**Rules:**
- Use `formOptions` when the form config is shared across components/tests
- Inline config in `useForm` when the form is used in one place only

---

## useForm Setup with Zod Validators

```typescript
import { useForm } from "@tanstack/react-form";

const form = useForm({
  validators: {
    onChange: formSchema
  },
  defaultValues: {
    email: "",
    password: ""
  }
});
```

---

## Basic Fields with `form.Field` Render Prop

Every field uses `form.Field` with a children render prop:

```typescript
<form.Field
  name="email"
  children={(field) => (
    <label>
      Email:
      <input
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
        type="text"
      />
      <FieldInfo field={field} />
    </label>
  )}
/>
```

**Rules:**
- `field.state.value` — current field value
- `field.handleChange(value)` — set the field value
- `field.handleBlur()` — mark field as touched
- `field.state.meta.isTouched` — has the field been blurred?
- `field.state.meta.errors` — array of validation error strings

---

## FieldInfo Helper Component

Extract error rendering into a reusable `FieldInfo` component:

```typescript
type FieldInfoProps = {
  field: {
    state: {
      meta: {
        isTouched: boolean;
        errors: string[];
      };
    };
  };
};

function FieldInfo({ field }: FieldInfoProps) {
  if (!field.state.meta.isTouched || field.state.meta.errors.length === 0) {
    return null;
  }
  return (
    <span role="alert">{field.state.meta.errors.join(", ")}</span>
  );
}
```

---

## Select / Complex Widget Fields

For selects and other complex widgets, use `field.handleChange` directly:

```typescript
<form.Field
  name="category"
  children={(field) => (
    <label>
      Category:
      <select
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      >
        <option value="">Select...</option>
        <option value="car">Car</option>
        <option value="truck">Truck</option>
      </select>
      <FieldInfo field={field} />
    </label>
  )}
/>
```

---

## Field Wrapper Components

For consistent field layout, create a wrapper that accepts a TanStack Field component as a child:

```typescript
type FormFieldWrapperProps = {
  label: string;
  children: React.ReactNode;
  error?: string;
};

function FormFieldWrapper({ label, children, error }: FormFieldWrapperProps) {
  return (
    <label>
      {label}:
      {children}
      {error && <span role="alert">{error}</span>}
    </label>
  );
}
```

Usage:

```typescript
<form.Field
  name="email"
  children={(field) => (
    <FormFieldWrapper
      label="Email"
      error={
        field.state.meta.isTouched
          ? field.state.meta.errors.join(", ")
          : undefined
      }
    >
      <input
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
    </FormFieldWrapper>
  )}
/>
```

---

## Inline Validators

For field-level validation that is not in the schema, pass a validator function:

```typescript
<form.Field
  name="confirmPassword"
  validators={{
    onChange: ({ value }) =>
      value !== form.getFieldValue("password")
        ? "Passwords must match"
        : undefined
  }}
  children={(field) => (
    <label>
      Confirm Password:
      <input
        type="password"
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
        onBlur={field.handleBlur}
      />
      <FieldInfo field={field} />
    </label>
  )}
/>
```

---

## Listeners for Side Effects

Use `listeners.onChange` to run side effects when form values change:

```typescript
const form = useForm({
  defaultValues: {
    country: "",
    city: ""
  },
  validators: {
    onChange: formSchema
  },
  listeners: {
    onChange: ({ formApi }) => {
      const country = formApi.getFieldValue("country");
      if (country) {
        // Fetch cities for the selected country
        fetchCities(country);
      }
    }
  }
});
```

---

## Reactive Subscriptions with `useStore` / `form.Subscribe`

Subscribe to form-level state outside of fields using `useStore`:

```typescript
import { useStore } from "@tanstack/react-form";

function SubmitButton() {
  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);

  return (
    <button type="submit" disabled={isSubmitting}>
      {isSubmitting ? "Submitting..." : "Submit"}
    </button>
  );
}
```

Or use `form.Subscribe` inline:

```typescript
<form.Subscribe
  selector={(state) => ({ isSubmitting: state.isSubmitting, isValid: state.isValid })}
  children={({ isSubmitting, isValid }) => (
    <button type="submit" disabled={!isValid || isSubmitting}>
      {isSubmitting ? "Submitting..." : "Submit"}
    </button>
  )}
/>
```

---

## Change Detection

Detect whether form values have changed from defaults using `useStore`:

```typescript
const [isDirty, setIsDirty] = useState(false);

useEffect(() => {
  const unsub = form.store.subscribe(() => {
    setIsDirty(form.state.isDirty);
  });
  return unsub;
}, []);
```

Or using the `form.Subscribe` selector:

```typescript
<form.Subscribe
  selector={(state) => state.isDirty}
  children={(isDirty) =>
    isDirty ? <span>Unsaved changes</span> : null
  }
/>
```

---

## Reset Pattern

Reset the form to its default values:

```typescript
<button type="button" onClick={() => form.reset()}>
  Reset
</button>
```

Call `form.reset()` after successful submission to clear the form:

```typescript
const handleFormSubmit = async (data: FormSchema) => {
  try {
    await onSubmit(data);
    form.reset();
  } catch (error: any) {
    showToastError("Error", error.message ?? "An error occurred");
  }
};
```

---

## Array Fields

For dynamic lists (e.g., images, features), use `mode="array"`:

```typescript
<form.Field mode="array" name="images">
  {(field) => (
    <fieldset>
      <legend>Images</legend>
      {field.state.value.map((_, index) => (
        <form.Field
          key={index}
          name={`images[${index}].url`}
          children={(subField) => (
            <div>
              <input
                value={subField.state.value}
                onChange={(e) => subField.handleChange(e.target.value)}
                onBlur={subField.handleBlur}
                placeholder="Image URL"
              />
              <button
                type="button"
                onClick={() => field.removeValue(index)}
              >
                Remove
              </button>
            </div>
          )}
        />
      ))}
      <button
        type="button"
        onClick={() => field.pushValue({ url: "" })}
      >
        Add Image
      </button>
    </fieldset>
  )}
</form.Field>
```

**Rules:**
- `field.pushValue(value)` — append an item
- `field.removeValue(index)` — remove an item at an index
- Nest `form.Field` inside the array field for each sub-field
- Use the array index as the `key` prop on nested field components

---

## Submission with Error Handling

```typescript
type Props = {
  onSubmit: (email: string, password: string) => Promise<void>;
  onError?: (message: string) => void;  // Wire up your toast library here
};

// Inside the component:
const form = useForm({
  validators: { onChange: formSchema },
  defaultValues: { email: "", password: "" },
  onSubmit: async ({ value }) => {
    try {
      await onSubmit(value.email, value.password);
      form.reset();
    } catch (error: any) {
      onError?.(error.message ?? "An error occurred");
    }
  }
});
```

Wiring the form element:

```tsx
<form onSubmit={(e) => {
  e.preventDefault();
  e.stopPropagation();
  form.handleSubmit();
}}>
  {/* fields */}
  <form.Subscribe
    selector={(state) => ({
      isSubmitting: state.isSubmitting,
      isValid: state.isValid
    })}
    children={({ isSubmitting, isValid }) => (
      <button type="submit" disabled={!isValid || isSubmitting}>
        {isSubmitting ? "Submitting..." : "Sign In"}
      </button>
    )}
  />
</form>
```

**Rules:**
- Use `form.handleSubmit()` — do NOT call `onSubmit` directly
- Always wrap the submit body in `try/catch`
- Always show the error via the `onError` callback
- Subscribe to `isSubmitting` and `isValid` to control the submit button
- Call `form.reset()` after successful submission

---

## Full Example

```typescript
import { useForm, useStore } from "@tanstack/react-form";
import { z } from "zod";

const formSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().trim().min(8).max(32)
});
type FormSchema = z.infer<typeof formSchema>;

type FieldInfoProps = {
  field: {
    state: {
      meta: {
        isTouched: boolean;
        errors: string[];
      };
    };
  };
};

function FieldInfo({ field }: FieldInfoProps) {
  if (!field.state.meta.isTouched || field.state.meta.errors.length === 0) {
    return null;
  }
  return <span role="alert">{field.state.meta.errors.join(", ")}</span>;
}

type Props = {
  buttonText: string;
  onSubmit: (email: string, password: string) => Promise<void>;
  onError?: (message: string) => void;  // Wire up your toast library here
};

export default function LoginForm({ buttonText, onSubmit, onError }: Props) {

  const form = useForm({
    validators: { onChange: formSchema },
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      try {
        await onSubmit(value.email, value.password);
        form.reset();
      } catch (error: any) {
        onError?.(error.message);
      }
    }
  });

  const isSubmitting = useStore(form.store, (state) => state.isSubmitting);
  const isValid = useStore(form.store, (state) => state.isValid);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
    >
      <form.Field
        name="email"
        children={(field) => (
          <label>
            Email:
            <input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              type="text"
            />
            <FieldInfo field={field} />
          </label>
        )}
      />
      <form.Field
        name="password"
        children={(field) => (
          <label>
            Password:
            <input
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              onBlur={field.handleBlur}
              type="password"
            />
            <FieldInfo field={field} />
          </label>
        )}
      />
      <button
        type="submit"
        disabled={!isValid || isSubmitting}
      >
        {isSubmitting ? "Loading..." : buttonText}
      </button>
    </form>
  );
}
```

---

## Rules Summary

### ✅ DO
- Define schema + inferred type at the top of the component
- Pass Zod schema to `validators.onChange` on `useForm`
- Use `form.Field` with render prop for all fields
- Use `field.state.value`, `field.handleChange`, `field.handleBlur` for field binding
- Extract a `FieldInfo` component for error rendering
- Use `useStore(form.store, selector)` or `form.Subscribe` for reactive subscriptions
- Wrap the submit body in `try/catch` with an `onError` callback
- Subscribe to `isSubmitting` and `isValid` for submit button state
- Use `form.reset()` after successful submission
- Use `formOptions()` for shared form configurations
- Use `mode="array"` with `pushValue`/`removeValue` for dynamic lists

### ❌ DON'T
- Don't access errors from a separate `errors` object — read from `field.state.meta.errors`
- Don't write TypeScript types manually — use `z.infer<typeof formSchema>`
- Don't skip `defaultValues` — TanStack Form needs them
- Don't call `onSubmit` directly on the form — use `form.handleSubmit()`
- Don't use raw inputs without `FieldInfo` — always show validation errors
