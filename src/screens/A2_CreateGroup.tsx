import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Banner, Button, Field, Screen, TodoPanel, inputClass } from "../components/ui";
import { CONTACTS } from "../data/seed";
import { useAppStore } from "../store/useAppStore";

/**
 * Create a group (US-01). Working skeleton: the store action and validation
 * are done; the screen needs design polish and the contact-consent step.
 */
export function CreateGroup() {
  const navigate = useNavigate();
  const me = useAppStore((s) => s.currentUserId);
  const members = useAppStore((s) => s.members);
  const createGroup = useAppStore((s) => s.createGroup);
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [error, setError] = useState<string>();

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <Screen title="New group" back="/">
      <Field label="Group name" hint="1–30 characters">
        <input className={inputClass} value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bali Trip 2026" />
      </Field>
      <p className="text-sm font-medium">Add members</p>
      {CONTACTS.filter((id) => id !== me).map((id) => (
        <label key={id} className="flex items-center gap-3 rounded-xl bg-white px-3 py-2">
          <Avatar member={members[id]} />
          <span className="flex-1 text-sm">
            {members[id].displayName}
            {!members[id].isDbsCustomer && <span className="block text-xs text-muted">Not a DBS/POSB customer</span>}
          </span>
          <input type="checkbox" className="h-5 w-5 accent-brand" checked={selected.includes(id)} onChange={() => toggle(id)} />
        </label>
      ))}
      {error && <Banner tone="error">{error}</Banner>}
      <Button
        onClick={() => {
          const r = createGroup(name, selected);
          if (!r.ok) return setError(r.error);
          navigate(`/groups/${r.value}`);
        }}
      >
        Create group
      </Button>
      <TodoPanel
        owner="#2 PM"
        stories="US-01, US-02, US-18"
        items={[
          "Contact-sync consent sheet before showing contacts (Section 7.5: local matching only, not stored, not for marketing)",
          "Search contacts by name or phone number",
          "Disable non-DBS contacts with an explanation instead of failing on submit",
          "Match the design system in Figma",
        ]}
      />
    </Screen>
  );
}
