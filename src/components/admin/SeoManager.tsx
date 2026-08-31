import React, { useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';

export const SEO_KEYS = [
  'seo_default_title',
  'seo_default_description',
  'seo_og_image',
  'seo_twitter_handle',
  'seo_google_verification',
  'seo_bing_verification',
  'ga_measurement_id',
  'plausible_domain',
] as const;

export type SeoKey = (typeof SEO_KEYS)[number];
export type SeoValues = Record<SeoKey, string>;

interface FieldDef {
  key: SeoKey;
  label: string;
  hint?: string;
  placeholder?: string;
  kind: 'text' | 'textarea' | 'twitter' | 'counter-text' | 'counter-textarea';
  limit?: number;
}

interface SectionDef {
  title: string;
  fields: FieldDef[];
}

const SECTIONS: SectionDef[] = [
  {
    title: 'Bayanai na tsoho',
    fields: [
      { key: 'seo_default_title', label: 'Take na tsoho', kind: 'counter-text', limit: 60 },
      {
        key: 'seo_default_description',
        label: 'Taƙaitaccen bayani na tsoho',
        kind: 'counter-textarea',
        limit: 160,
      },
    ],
  },
  {
    title: 'Kafofin sada zumunta',
    fields: [
      { key: 'seo_og_image', label: 'Hoton OG na tsoho', hint: 'Hanya ko URL cikakke', placeholder: '/og-image.jpg', kind: 'text' },
      { key: 'seo_twitter_handle', label: 'Asalin Twitter / X', placeholder: 'yancinews', kind: 'twitter' },
    ],
  },
  {
    title: 'Tabbatarwa',
    fields: [
      { key: 'seo_google_verification', label: 'Google Search Console', hint: 'Daga Google Search Console', placeholder: 'google-site-verification=...', kind: 'text' },
      { key: 'seo_bing_verification', label: 'Bing Webmaster', hint: 'Daga Bing Webmaster Tools', kind: 'text' },
    ],
  },
  {
    title: 'Analytics',
    fields: [
      { key: 'ga_measurement_id', label: 'Google Analytics ID', placeholder: 'G-XXXXXXXXXX', kind: 'text' },
      { key: 'plausible_domain', label: 'Plausible domain', hint: 'Domain kamar yanci.ng', placeholder: 'yanci.ng', kind: 'text' },
    ],
  },
];

const INPUT_CLASS =
  'w-full border border-yanci-primary/25 bg-white px-3 py-2 text-sm focus:border-yanci-accent focus:outline-none focus:ring-2 focus:ring-yanci-accent/40';

function CharCount({ value, limit }: { value: string; limit: number }) {
  const len = [...value].length;
  return (
    <span className={`ml-auto text-[11px] tabular-nums ${len > limit ? 'font-bold text-yanci-red' : 'text-yanci-primary/40'}`}>
      {len}/{limit}
    </span>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] || url;
  }
}

interface SeoManagerProps {
  docId: string;
  values: SeoValues;
  siteName: string;
  tagline: string;
  siteUrl: string;
}

export default function SeoManager({ docId, values: initial, siteName, tagline, siteUrl }: SeoManagerProps) {
  const [values, setValues] = useState<SeoValues>(initial);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseline = useRef<SeoValues>(initial);

  const dirty = useMemo(
    () => SEO_KEYS.some((key) => values[key] !== baseline.current[key]),
    [values],
  );

  const previewTitle = values.seo_default_title.trim() || `${siteName} — ${tagline}`;
  const previewDesc =
    values.seo_default_description.trim() ||
    'Labarai, siyasa, wasanni da al’adu a yaren Hausa, kai tsaye daga Najeriya.';
  const displayHost = hostOf(siteUrl);

  function update(key: SeoKey, value: string): void {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
    setError(null);
  }

  function onText(key: SeoKey) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update(key, e.target.value);
  }

  function onTwitter(e: ChangeEvent<HTMLInputElement>): void {
    update('seo_twitter_handle', `@${e.target.value.replace(/@+/g, '')}`);
  }

  async function save(): Promise<void> {
    if (busy || !docId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/seo/${encodeURIComponent(docId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(typeof data?.message === 'string' ? data.message : 'Ajiye bai yi nasara ba');
      }
      baseline.current = values;
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ajiye bai yi nasara ba');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-5">
      <div className="space-y-6 lg:col-span-3">
        {SECTIONS.map((section) => (
          <fieldset key={section.title} className="border border-yanci-primary/15 bg-white/60 p-5">
            <legend className="px-2 font-serif text-base font-bold text-yanci-primary">{section.title}</legend>
            <div className="space-y-4">
              {section.fields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={field.key} className="mb-1 flex items-baseline text-xs font-bold uppercase tracking-wide text-yanci-primary/70">
                    {field.label}
                    {(field.kind === 'counter-text' || field.kind === 'counter-textarea') && field.limit && (
                      <CharCount value={values[field.key]} limit={field.limit} />
                    )}
                  </label>
                  {field.kind === 'twitter' ? (
                    <div className="flex">
                      <span className="inline-flex items-center border border-r-0 border-yanci-primary/25 bg-yanci-paper px-3 text-sm text-yanci-primary/50">@</span>
                      <input
                        id={field.key}
                        value={values[field.key].replace(/^@+/, '')}
                        onChange={onTwitter}
                        placeholder={field.placeholder}
                        className={`${INPUT_CLASS} flex-1`}
                      />
                    </div>
                  ) : field.kind === 'textarea' || field.kind === 'counter-textarea' ? (
                    <textarea
                      id={field.key}
                      rows={3}
                      value={values[field.key]}
                      onChange={onText(field.key)}
                      placeholder={field.placeholder}
                      className={INPUT_CLASS}
                    />
                  ) : (
                    <input
                      id={field.key}
                      type="text"
                      value={values[field.key]}
                      onChange={onText(field.key)}
                      placeholder={field.placeholder}
                      className={INPUT_CLASS}
                    />
                  )}
                  {field.hint && <p className="mt-1 text-[11px] text-yanci-primary/45">{field.hint}</p>}
                </div>
              ))}
            </div>
          </fieldset>
        ))}

        <div>
          <button
            onClick={save}
            disabled={busy || !dirty}
            className="bg-yanci-primary px-8 py-2.5 text-sm font-bold uppercase tracking-wide text-yanci-paper hover:bg-yanci-primary/90 disabled:opacity-50"
          >
            {busy ? 'Ana ajiye…' : 'Ajiye saitin'}
          </button>
          <span className="ml-4 text-xs">
            {error && <span className="font-medium text-yanci-red">{error}</span>}
            {!error && saved && <span className="font-bold text-yanci-teal">An ajiye!</span>}
            {!error && !saved && dirty && <span className="text-yanci-primary/50">Ana canje-bayanai da ba a ajiye ba</span>}
          </span>
        </div>
      </div>

      <aside className="space-y-4 lg:col-span-2 lg:sticky lg:top-6">
        <div className="border border-yanci-primary/15 bg-white/60 p-5">
          <h2 className="mb-3 font-serif text-base font-bold text-yanci-primary">Preview a Google</h2>
          <div className="rounded-md border border-black/10 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-full bg-yanci-primary font-serif text-xs font-bold text-yanci-paper">
                {siteName.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs leading-tight text-[#202124]">{siteName}</span>
                <span className="block truncate text-xs leading-tight text-[#4d5156]">{displayHost}</span>
              </span>
            </div>
            <p className="mt-1.5 line-clamp-2 text-lg leading-snug text-[#1a0dab]">{previewTitle}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-snug text-[#4d5156]">{previewDesc}</p>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-yanci-primary/50">
            Take ya fi kyau a ƙasa da haruffa 60, bayani kuma a ƙasa da 160.
          </p>
        </div>

        <div className="border border-yanci-primary/15 bg-white/60 p-5 text-xs leading-relaxed text-yanci-primary/60">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-yanci-primary/70">Amfani</p>
          <ul className="list-disc space-y-1 pl-4">
            <li>Take da bayani suna cike takaitaccen meta id ba a saita su ba.</li>
            <li>Hoton OG na tsoho yana fitowa lokacin raba shafi a kafofin sada zumunta.</li>
            <li>Tabbatarwa da Analytics suna buƙatar saiti a cikin shafin.</li>
          </ul>
        </div>
      </aside>
    </div>
  );
}
