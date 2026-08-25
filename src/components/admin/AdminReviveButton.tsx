import type { MouseEvent } from 'react';

const FRESH_BADGE =
  '<span class="rounded-sm bg-yanci-teal/15 px-2 py-0.5 text-xs font-semibold text-yanci-teal">Sabunta</span>';

export default function AdminReviveButton({ articleId }: { articleId: string }) {
  let busy = false;

  function toast(message: string, tone: 'ok' | 'err') {
    const el = document.createElement('div');
    el.setAttribute('aria-live', 'polite');
    el.textContent = message;
    el.className = `fixed bottom-6 right-6 z-50 px-4 py-3 text-sm font-medium shadow-lg transition-opacity ${
      tone === 'ok' ? 'bg-yanci-primary text-yanci-paper' : 'bg-yanci-red text-white'
    }`;
    document.body.appendChild(el);
    window.setTimeout(() => el.remove(), 3000);
  }

  async function revive(event: MouseEvent<HTMLButtonElement>) {
    const button = event.currentTarget as HTMLButtonElement;
    if (busy) return;
    busy = true;
    button.disabled = true;
    button.textContent = 'Ana sabuntawa…';

    const row = button.closest('tr');
    const ageCell = row?.querySelector<HTMLElement>('[data-cell="age"]');
    const updatedCell = row?.querySelector<HTMLElement>('[data-cell="updated"]');
    const prevAge = ageCell?.innerHTML;
    const prevUpdated = updatedCell?.textContent ?? '';

    if (ageCell) ageCell.innerHTML = FRESH_BADGE;
    if (updatedCell) updatedCell.textContent = 'Yanzu';

    try {
      const res = await fetch('/api/admin/articles/revive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: articleId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) throw new Error(data.message ?? 'Sabunta ta kasa');
      toast('An sabunta labarin', 'ok');
    } catch (err) {
      if (ageCell && prevAge !== undefined) ageCell.innerHTML = prevAge;
      if (updatedCell) updatedCell.textContent = prevUpdated;
      toast(err instanceof Error ? err.message : 'Sabunta ta kasa', 'err');
    } finally {
      busy = false;
      button.disabled = false;
      button.textContent = 'Sabunta';
    }
  }

  return (
    <button
      type="button"
      onClick={revive}
      className="text-xs font-bold uppercase tracking-wide text-yanci-teal transition-colors hover:text-yanci-teal/70 disabled:opacity-50"
    >
      Sabunta
    </button>
  );
}
