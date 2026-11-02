"use client";

import { useState } from "react";
import { FormDialog } from "@/components/form-dialog";
import { Button, DataTable, Field, Gate, PageHeader } from "@/components/ui";
import { can } from "@/lib/access";
import { bankList } from "@/lib/constants";
import { useDesk } from "@/lib/store";

export default function BankMasterPage() {
  const { state, replace } = useDesk();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  if (!state) return null;
  const banks = bankList(state).filter((bank) => bank !== "Other");
  const added = [...(state.banks ?? [])].reverse();
  const rows = [...added, ...banks.filter((bank) => !added.includes(bank))];

  function close() {
    setOpen(false);
    setName("");
    setError("");
  }

  function save() {
    const value = name.trim();
    if (!value) {
      setError("Bank name is required.");
      return;
    }
    if (banks.some((bank) => bank.toLowerCase() === value.toLowerCase())) {
      setError("This bank is already in the master.");
      return;
    }
    replace({ ...state!, banks: [...(state!.banks ?? []), value] });
    close();
  }

  return (
    <Gate module="Banks">
      <div className="page">
        <PageHeader title="Bank master" lede="Banks available for relationships, exposures and loan delivery records." />
        <div className="filters">
          {can(state, "Banks", "create") && (
            <Button type="button" className="push" onClick={() => setOpen(true)}>
              + Add bank
            </Button>
          )}
        </div>
        <DataTable>
          <thead>
            <tr>
              <th>Bank</th>
              <th>Customers with a relationship</th>
              <th>Loan deliveries</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((bank) => (
              <tr key={bank}>
                <td>{bank}</td>
                <td>{state.customers.filter((customer) => customer.banks.some((row) => row.bank === bank)).length}</td>
                <td>{state.loanDeliveries.filter((row) => row.bank === bank).length}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
        <FormDialog open={open} size="small" title="Add bank" submitLabel="Add bank" onClose={close} onSubmit={save}>
          <Field label="Bank name" required error={error}>
            <input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} />
          </Field>
        </FormDialog>
      </div>
    </Gate>
  );
}
