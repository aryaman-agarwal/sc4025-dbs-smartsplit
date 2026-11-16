import { Contact, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Avatar, Banner, Button, Field, Screen, Sheet, inputClass } from "../components/ui";
import { CONFIG } from "../domain/config";
import { CONTACTS } from "../data/seed";
import { useAppStore } from "../store/useAppStore";

/**
 * Create a group (US-01, US-02, Section 7.5).
 * Contacts are shown only after the member allows contact matching. Friends who
 * aren't DBS/POSB customers are listed but can't be picked, with the reason shown.
 * Invitees join as "Pending" and get nothing until they accept (US-02).
 */
export function CreateGroup() {
  const navigate = useNavigate();
  const me = useAppStore((s) => s.currentUserId);
  const members = useAppStore((s) => s.members);
  const createGroup = useAppStore((s) => s.createGroup);
  const contactsConsent = useAppStore((s) => s.contactsConsent[me]);
  const giveContactsConsent = useAppStore((s) => s.giveContactsConsent);
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [askConsent, setAskConsent] = useState(false);
  const [error, setError] = useState<string>();

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const contacts = CONTACTS.filter((id) => id !== me).filter((id) => members[id].displayName.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <Screen title="New group" back="/">
      <Field label="Group name" hint={`1–${CONFIG.groupNameMaxLength} characters`}>
        <input className={inputClass} value={name} maxLength={CONFIG.groupNameMaxLength} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bali Trip 2026" />
      </Field>

      <p className="text-sm font-medium">Add members</p>
      {!contactsConsent ? (
        <div className="flex flex-col items-center gap-2 rounded-xl bg-white px-4 py-6 text-center">
          <Contact size={28} className="text-brand" />
          <p className="text-sm font-semibold">Find friends who bank with DBS/POSB</p>
          <p className="text-xs text-muted">We check your contacts on this phone to see who can join.</p>
          <Button className="mt-1 w-full" onClick={() => setAskConsent(true)}>
            Find friends
          </Button>
        </div>
      ) : (
        <>
          <label className="relative">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
            <input className={`${inputClass} pl-9`} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts" aria-label="Search contacts" />
          </label>
          {contacts.length === 0 && <p className="px-1 text-sm text-muted">No contacts match "{query}".</p>}
          {contacts.map((id) => {
            const m = members[id];
            const eligible = m.isDbsCustomer;
            return (
              <label key={id} className={`flex items-center gap-3 rounded-xl bg-white px-3 py-2 ${eligible ? "" : "opacity-60"}`}>
                <Avatar member={m} />
                <span className="flex-1 text-sm">
                  {m.displayName}
                  {!eligible && <span className="block text-xs text-muted">Not a DBS/POSB customer yet. Only DBS/POSB customers can join in this version.</span>}
                </span>
                <input
                  type="checkbox"
                  className="h-5 w-5 accent-brand"
                  disabled={!eligible}
                  checked={selected.includes(id)}
                  onChange={() => toggle(id)}
                  aria-label={`Add ${m.displayName}`}
                />
              </label>
            );
          })}
          <p className="px-1 text-xs text-muted">Invited friends show as Pending and aren't added to any split or vault until they accept.</p>
        </>
      )}

      {error && <Banner tone="error">{error}</Banner>}
      <Button
        disabled={!contactsConsent}
        onClick={() => {
          const r = createGroup(name, selected);
          if (!r.ok) return setError(r.error);
          navigate(`/groups/${r.value}`);
        }}
      >
        Create group{selected.length > 0 ? ` with ${selected.length} friend${selected.length > 1 ? "s" : ""}` : ""}
      </Button>

      {askConsent && (
        <Sheet title="Allow contact matching?" onClose={() => setAskConsent(false)}>
          <ul className="flex flex-col gap-2 text-sm">
            <li>
              <span className="font-medium">Matched on your phone only.</span> We check which contacts are DBS/POSB customers without uploading your
              address book.
            </li>
            <li>
              <span className="font-medium">Not stored.</span> Contacts you don't invite are forgotten once you leave this screen.
            </li>
            <li>
              <span className="font-medium">Never used for marketing.</span> This is separate from the marketing choice in Privacy settings.
            </li>
          </ul>
          <Button
            onClick={() => {
              giveContactsConsent();
              setAskConsent(false);
            }}
          >
            Allow
          </Button>
          <Button variant="secondary" onClick={() => setAskConsent(false)}>
            Not now
          </Button>
        </Sheet>
      )}
    </Screen>
  );
}
