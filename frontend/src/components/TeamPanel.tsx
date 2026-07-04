import { useEffect, useState, type FormEvent } from "react";
import { addOrgMember, fetchOrgMembers, removeOrgMember } from "../api";

type TeamPanelProps = {
  userEmail: string;
};

export function TeamPanel({ userEmail }: TeamPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [organization, setOrganization] = useState("");
  const [companyDomain, setCompanyDomain] = useState("");
  const [members, setMembers] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [available, setAvailable] = useState(false);

  async function loadMembers() {
    setLoading(true);
    setError(null);
    try {
      const payload = await fetchOrgMembers();
      setOrganization(payload.organization);
      setCompanyDomain(payload.company_domain);
      setMembers(payload.members.map((member) => member.email));
      setAvailable(true);
    } catch {
      setAvailable(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadMembers();
  }, [userEmail]);

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await addOrgMember(newEmail.trim());
      setMembers(response.members);
      setNewEmail("");
      setNotice(
        response.invited
          ? `Added ${response.email} and sent an invite email.`
          : `Added ${response.email}. Share your organization password with them.`,
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to add teammate.");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(email: string) {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await removeOrgMember(email);
      setMembers(response.members);
      setNotice(`Removed ${email}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to remove teammate.");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !available) {
    return null;
  }

  return (
    <section className="panel team-panel">
      <div className="panel-header">
        <div>
          <h2>Team access</h2>
          <p className="team-panel-copy">
            Add authorized HR and comp teammates for {organization}. Each person signs in with
            their own @{companyDomain} email and your shared organization password.
          </p>
        </div>
        <button
          className="button button-secondary button-small"
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide" : "Manage team"}
        </button>
      </div>

      {open ? (
        <div className="team-panel-body">
          <ul className="team-member-list">
            {members.map((email) => (
              <li key={email}>
                <span>{email}</span>
                {email !== userEmail ? (
                  <button
                    className="button button-secondary button-small"
                    disabled={saving}
                    type="button"
                    onClick={() => void handleRemove(email)}
                  >
                    Remove
                  </button>
                ) : (
                  <span className="team-member-you">You</span>
                )}
              </li>
            ))}
          </ul>

          <form className="team-add-form" onSubmit={(event) => void handleAdd(event)}>
            <label className="field">
              <span>Add teammate</span>
              <input
                type="email"
                required
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                placeholder={`name@${companyDomain}`}
              />
            </label>
            <button className="button button-primary" disabled={saving} type="submit">
              {saving ? "Saving..." : "Add teammate"}
            </button>
          </form>

          {error ? <div className="alert alert-error">{error}</div> : null}
          {notice ? <div className="alert alert-info">{notice}</div> : null}
        </div>
      ) : null}
    </section>
  );
}
