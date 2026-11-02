"use client";

import { useEffect, useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Field } from "@/components/ui";
import { createLead } from "@/lib/actions";
import { EMIRATES, LEGAL_TYPES, LOBS } from "@/lib/constants";
import { useDesk } from "@/lib/store";

export function CreateCustomerDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (code: string) => void }) {
  const { state, replace, user } = useDesk();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) return;
    setName("");
    setEmail("");
    setMobile("");
    setErrors({});
  }, [open]);

  function save() {
    if (!state || !user) return;
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Name is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) next.email = "Enter a valid email address.";
    if (!/^\+?[0-9 ()-]{7,20}$/.test(mobile.trim())) next.mobile = "Enter a valid mobile number.";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    const result = createLead(
      state,
      {
        name,
        legalType: LEGAL_TYPES[0],
        tradeLicense: "",
        lob: LOBS[0],
        relationship: "Main",
        country: "United Arab Emirates",
        emirate: EMIRATES[0],
        address: "",
        tenancy: "No",
        contactName: name.trim(),
        contactType: "Owner",
        mobile,
        email,
        service: "",
        assignedTo: user.id,
      },
      user,
    );
    replace(result.state);
    onSaved(result.code);
  }

  return (
    <FormDialog open={open} size="small" title="Create customer" description="Add the basics. Complete the rest on the customer profile." submitLabel="Create customer" onClose={onClose} onSubmit={save}>
      <div className="fields">
        <Field label="Name" required error={errors.name} className="span-2">
          <input value={name} maxLength={200} onChange={(event) => setName(event.target.value)} />
        </Field>
        <Field label="Email" required error={errors.email}>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Mobile number" required error={errors.mobile}>
          <input type="tel" value={mobile} onChange={(event) => setMobile(event.target.value)} />
        </Field>
      </div>
    </FormDialog>
  );
}
