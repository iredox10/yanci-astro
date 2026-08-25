import { useMemo, useState } from 'react';
import type { RoleView } from '@lib/roles';

interface RolesManagerProps {
  roles: RoleView[];
  groups: { group: string; permissions: string[] }[];
  labels: Record<string, string>;
  defaults: Record<string, Record<string, boolean>>;
}

interface Draft {
  id: string | null;
  name: string;
  description: string;
  priority: number;
  permissions: string[];
}

const PRESET_ORDER = ['super_admin', 'managing_editor', 'editor', 'author', 'contributor'];

const emptyDraft = (): Draft => ({ id: null, name: '', description: '', priority: 0, permissions: [] });

const presetLabel = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export default function RolesManager({ roles: initial, groups, labels, defaults }: RolesManagerProps) {
  const [roles, setRoles] = useState<RoleView[]>(initial);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalPermissions = useMemo(() => groups.reduce((n, g) => n + g.permissions.length, 0), [groups]);
  const presets = useMemo(() => PRESET_ORDER.filter((k) => defaults[k]), [defaults]);

  async function refresh(): Promise<void> {
    const res = await fetch('/api/admin/roles');
    const data: unknown = await res.json().catch(() => null);
    if (!res.ok || !data || typeof data !== 'object') return;
    const list = (data as { roles?: unknown }).roles;
    if (Array.isArray(list)) setRoles(list as RoleView[]);
  }

  function openCreate(): void {
    setError(null);
    setDraft(emptyDraft());
  }

  function openEdit(role: RoleView): void {
    if (role.locked) return;
    setError(null);
    setDraft({
      id: role.$id,
      name: role.name,
      description: role.description,
      priority: role.priority,
      permissions: [...role.permissions],
    });
  }

  function toggle(key: string): void {
    if (!draft) return;
    setDraft({
      ...draft,
      permissions: draft.permissions.includes(key)
        ? draft.permissions.filter((k) => k !== key)
        : [...draft.permissions, key],
    });
  }

  function toggleGroup(keys: string[]): void {
    if (!draft) return;
    const allOn = keys.every((k) => draft.permissions.includes(k));
    setDraft({
      ...draft,
      permissions: allOn
        ? draft.permissions.filter((k) => !keys.includes(k))
        : [...new Set([...draft.permissions, ...keys])],
    });
  }

  function applyPreset(name: string): void {
    if (!draft) return;
    const preset = defaults[name];
    setDraft({ ...draft, permissions: preset ? Object.keys(preset).filter((k) => preset[k]) : [] });
  }

  async function save(): Promise<void> {
    if (!draft || busy) return;
    if (!draft.name.trim()) {
      setError('Role name is required');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: draft.name,
        description: draft.description,
        priority: draft.priority,
        permissions: draft.permissions,
      };
      const res = await fetch(
        draft.id ? `/api/admin/roles/${encodeURIComponent(draft.id)}` : '/api/admin/roles',
        {
          method: draft.id ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.message === 'string' ? data.message : 'Save failed');
      await refresh();
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  async function remove(role: RoleView): Promise<void> {
    if (role.locked || busy) return;
    const members = role.members > 0 ? ` ${role.members} member${role.members === 1 ? '' : 's'} will lose this role.` : '';
    if (!window.confirm(`Delete role "${role.name}"?${members}`)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/roles/${encodeURIComponent(role.$id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.message === 'string' ? data.message : 'Delete failed');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 border-b border-yanci-primary/15 pb-4">
        <div>
          <h2 className="font-serif text-xl font-bold text-yanci-primary">Role definitions</h2>
          <p className="mt-1 text-sm text-yanci-primary/60">
            Named roles with permission sets. System roles are protected and cannot be edited or deleted.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="shrink-0 bg-yanci-primary px-4 py-2 text-sm font-bold text-yanci-paper transition-colors hover:bg-yanci-primary/90"
        >
          New role
        </button>
      </div>

      {error && (
        <p className="border border-yanci-red/30 bg-red-50 px-4 py-2 text-sm text-yanci-red" role="alert">{error}</p>
      )}

      <div className="overflow-x-auto border border-yanci-primary/15 bg-white/60">
        <table className="w-full text-left text-sm">
          <thead className="bg-yanci-primary/5 text-xs uppercase tracking-wide text-yanci-primary/60">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Role</th>
              <th className="px-4 py-2.5 font-semibold">Members</th>
              <th className="px-4 py-2.5 font-semibold">Permissions</th>
              <th className="px-4 py-2.5 font-semibold">Priority</th>
              <th className="px-4 py-2.5 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-yanci-primary/10">
            {roles.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-yanci-primary/50">No roles defined yet.</td></tr>
            )}
            {roles.map((role) => (
              <tr key={role.$id} className="hover:bg-white/80">
                <td className="max-w-xs px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-yanci-primary">{role.name}</span>
                    {role.isSystem && (
                      <span className="rounded-full bg-yanci-accent/20 px-2 py-0.5 text-[10px] font-bold uppercase text-yanci-primary">System</span>
                    )}
                    {!role.isSystem && role.locked && (
                      <span className="rounded-full bg-yanci-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-yanci-primary/70">Locked</span>
                    )}
                  </div>
                  {role.description && <p className="mt-0.5 line-clamp-1 text-xs text-yanci-dark/60">{role.description}</p>}
                </td>
                <td className="px-4 py-3 text-yanci-dark/70">{role.members}</td>
                <td className="px-4 py-3">
                  <span className="font-medium text-yanci-primary">{role.permissions.length}</span>
                  <span className="text-yanci-dark/40"> / {totalPermissions}</span>
                </td>
                <td className="px-4 py-3 text-yanci-dark/70">{role.priority}</td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  {role.locked ? (
                    <span className="text-xs text-yanci-primary/40">Protected</span>
                  ) : (
                    <>
                      <button onClick={() => openEdit(role)} className="mr-3 text-xs font-medium text-yanci-teal hover:text-yanci-teal/70">Edit</button>
                      <button onClick={() => remove(role)} disabled={busy} className="text-xs font-medium text-yanci-red hover:text-yanci-red/70 disabled:opacity-40">Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {draft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-yanci-primary/10 p-5">
              <h3 className="font-serif text-lg font-bold text-yanci-primary">{draft.id ? 'Edit role' : 'New role'}</h3>
              <button onClick={() => setDraft(null)} className="text-xl leading-none text-yanci-primary/40 hover:text-yanci-primary/70" aria-label="Close">&times;</button>
            </div>

            <div className="space-y-4 p-5">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-yanci-primary/70">Role name</span>
                <input
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  placeholder="e.g. Senior Editor"
                  className="w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-yanci-primary/70">Description</span>
                <input
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="What this role can do"
                  className="w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40"
                />
              </label>
              <div className="flex flex-wrap items-end gap-4">
                <label className="block w-32">
                  <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-yanci-primary/70">Priority</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.priority}
                    onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) || 0 })}
                    className="w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40"
                  />
                </label>
                <div className="flex flex-wrap gap-1">
                  {presets.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => applyPreset(preset)}
                      className="border border-yanci-primary/25 px-2 py-1 text-xs font-medium text-yanci-primary/70 hover:bg-yanci-primary/10"
                    >
                      Use {presetLabel(preset)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-yanci-primary/70">
                  Permissions ({draft.permissions.length}/{totalPermissions})
                </span>
                {groups.map((group) => {
                  const allOn = group.permissions.every((k) => draft.permissions.includes(k));
                  return (
                    <div key={group.group} className="mb-4">
                      <div className="mb-2 flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-yanci-primary/50">{group.group}</h4>
                        <button
                          onClick={() => toggleGroup(group.permissions)}
                          className="text-[11px] font-bold uppercase text-yanci-teal hover:text-yanci-teal/70"
                        >
                          {allOn ? 'Clear all' : 'Select all'}
                        </button>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {group.permissions.map((key) => {
                          const on = draft.permissions.includes(key);
                          return (
                            <label
                              key={key}
                              className={`flex cursor-pointer items-center gap-2 rounded-sm border px-3 py-2 text-sm font-medium transition-colors ${
                                on
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                  : 'border-yanci-primary/15 bg-yanci-paper text-yanci-dark/50 hover:bg-yanci-primary/5'
                              }`}
                            >
                              <input type="checkbox" checked={on} onChange={() => toggle(key)} className="accent-emerald-600" />
                              {labels[key] ?? key}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-yanci-primary/10 p-5">
              <button onClick={() => setDraft(null)} className="rounded-sm px-4 py-2 text-sm font-bold text-yanci-primary/60 hover:bg-yanci-primary/10">Cancel</button>
              <button
                onClick={save}
                disabled={busy || !draft.name.trim()}
                className="bg-yanci-primary px-6 py-2 text-sm font-bold uppercase tracking-wide text-yanci-paper hover:bg-yanci-primary/90 disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
