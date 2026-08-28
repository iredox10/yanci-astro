// @ts-nocheck
import { useState, useEffect } from 'react';
import {
  FaChevronDown,
  FaChevronUp,
  FaCheck,
  FaXmark,
  FaClock,
  FaBolt,
  FaCalendarCheck,
  FaGear,
  FaImage,
  FaMagnifyingGlass,
  FaShareNodes,
  FaLink,
  FaNewspaper,
  FaQuoteLeft,
  FaCircleInfo,
  FaWandMagicSparkles,
  FaTriangleExclamation,
  FaClockRotateLeft,
  FaCloudArrowUp,
  FaTrash,
} from 'react-icons/fa6';
import { PILLAR_SECTIONS, ARTICLE_FORMATS } from './constants';
import TagInput from './TagInput';
import RelatedPicker from './RelatedPicker';
import FocalPointPicker from './FocalPointPicker';
import EditorialNotesPanel from './EditorialNotesPanel';

const Card = ({
  title,
  icon: Icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  icon?: any;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors" type="button">
        <div className="flex items-center gap-2.5">
          {Icon && <Icon className="w-4 h-4 text-gray-400" />}
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">{title}</span>
          {badge}
        </div>
        {open ? <FaChevronUp className="w-3 h-3 text-gray-400" /> : <FaChevronDown className="w-3 h-3 text-gray-400" />}
      </button>
      {open && <div className="px-5 pb-5 pt-0">{children}</div>}
    </div>
  );
};

const Field = ({ label, children, hint }: { label?: string; children: React.ReactNode; hint?: string }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</label>}
    {children}
    {hint && <p className="text-[10px] text-gray-400">{hint}</p>}
  </div>
);

const Input = (props: any) => (
  <input
    {...props}
    className={`w-full text-sm p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#052962]/20 focus:border-[#052962] transition-all ${props.className || ''}`}
  />
);

const Select = (props: any) => (
  <select
    {...props}
    className={`w-full text-sm p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#052962]/20 focus:border-[#052962] transition-all ${props.className || ''}`}
  />
);

const Textarea = (props: any) => (
  <textarea
    {...props}
    className={`w-full text-sm p-2.5 bg-white border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#052962]/20 focus:border-[#052962] resize-none transition-all ${props.className || ''}`}
  />
);

const Toggle = ({ checked, onChange, label, icon: Icon }: { checked: boolean; onChange: () => void; label: string; icon?: any }) => (
  <label className="flex items-center justify-between cursor-pointer group">
    <span className="text-xs font-semibold text-gray-700 flex items-center gap-2">
      {Icon && <Icon className={`w-3.5 h-3.5 ${checked ? 'text-[#052962]' : 'text-gray-300'}`} />}
      {label}
    </span>
    <button
      type="button"
      onClick={onChange}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-[#052962]' : 'bg-gray-300'}`}
      role="switch"
      aria-checked={checked}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  </label>
);

const HealthRing = ({ score, passed, total }: { score: number; passed: number; total: number }) => {
  const color = score === 100 ? 'text-green-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
  const bg = score === 100 ? 'bg-green-50' : score >= 60 ? 'bg-amber-50' : 'bg-red-50';
  return (
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center text-xs font-black ${color}`}>{score}%</div>
      <div>
        <p className="text-xs font-bold text-gray-700">{score === 100 ? 'Ready to publish' : score >= 60 ? 'Almost ready' : 'Needs work'}</p>
        <p className="text-[10px] text-gray-400">
          {passed}/{total} checks passed
        </p>
      </div>
    </div>
  );
};

interface Props {
  formData: Record<string, any>;
  setFormData: React.Dispatch<React.SetStateAction<Record<string, any>>>;
  setIsDirty: (v: boolean) => void;
  isEditing: boolean;
  id?: string;
  user?: Record<string, any> | null;
  articles: any[];
  articleHealth: { score: number; passed: number; total: number; checks: Array<{ ok: boolean; label: string }> };
  wordCount: number;
  pullQuotes: any[];
  onRemovePullQuote: (id: string) => void;
  editorialNotes: any[];
  onAddNote: (text: string) => void;
  onResolveNote: (id: string) => void;
  onDeleteNote: (id: string) => void;
  onOpenLinkPicker: () => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>, field: string) => void;
  grammarResult: any;
  checkingGrammar: boolean;
  onRunGrammar: () => void;
  translating: boolean;
  onTranslate: (lang: string) => void;
  altTextGenerating: boolean;
  onGenerateAltText: () => void;
  headlineScores: any[];
  scoringHeadlines: boolean;
  onScoreHeadlines: () => void;
  discoverAnalysis: any;
  analyzingDiscover: boolean;
  onAnalyzeDiscover: () => void;
  repurposedContent: any;
  repurposing: boolean;
  onRepurpose: () => void;
  aiLoading: boolean;
  onGenerateAi: () => void;
}

const EditorSidebar = ({
  formData,
  setFormData,
  setIsDirty,
  isEditing,
  id,
  user,
  articles,
  articleHealth,
  wordCount,
  pullQuotes,
  onRemovePullQuote,
  editorialNotes,
  onAddNote,
  onResolveNote,
  onDeleteNote,
  onOpenLinkPicker,
  onFileUpload,
  grammarResult,
  checkingGrammar,
  onRunGrammar,
  translating,
  onTranslate,
  altTextGenerating,
  onGenerateAltText,
  headlineScores,
  scoringHeadlines,
  onScoreHeadlines,
  discoverAnalysis,
  analyzingDiscover,
  onAnalyzeDiscover,
  repurposedContent,
  repurposing,
  onRepurpose,
  aiLoading,
  onGenerateAi,
}: Props) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev: Record<string, any>) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    setIsDirty(true);
  };

  const setField = (patch: Record<string, any>) => {
    setFormData((prev: Record<string, any>) => ({ ...prev, ...patch }));
    setIsDirty(true);
  };

  const currentSections = PILLAR_SECTIONS[formData.pillar] || PILLAR_SECTIONS.news;

  const setBreaking = (enabled: boolean) => {
    if (enabled) {
      const until = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      setField({ is_breaking: true, breaking_duration: 24, breaking_until: until });
    } else {
      setField({ is_breaking: false, breaking_duration: null, breaking_until: '' });
    }
  };

  return (
    <aside className="w-full xl:w-[380px] border-l border-gray-200 bg-white overflow-hidden flex flex-col h-full">
      <div className="p-5 border-b border-gray-100 bg-gray-50/50">
        <HealthRing score={articleHealth.score} passed={articleHealth.passed} total={articleHealth.total} />
        <div className="mt-3 grid grid-cols-2 gap-1.5">
          {articleHealth.checks.slice(0, 4).map((check, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[10px]">
              {check.ok ? <FaCheck className="w-2.5 h-2.5 text-green-500" /> : <FaXmark className="w-2.5 h-2.5 text-gray-300" />}
              <span className={check.ok ? 'text-gray-600' : 'text-gray-300'}>{check.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <Card title="Publish" icon={FaCalendarCheck} defaultOpen>
          <div className="space-y-4">
            <Field label="Status">
              <Select name="status" value={formData.status} onChange={handleChange}>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="scheduled">Scheduled</option>
                <option value="review">In Review</option>
              </Select>
            </Field>

            {formData.status === 'scheduled' && (
              <Field
                label="Publish at"
                hint={
                  formData.publishAt
                    ? `Scheduled: ${new Date(formData.publishAt).toLocaleString('ha', { dateStyle: 'medium', timeStyle: 'short' })}`
                    : 'Select a date and time'
                }
              >
                <div className="relative">
                  <FaClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                  <Input type="datetime-local" name="publishAt" value={formData.publishAt || ''} onChange={handleChange} className="pl-9" />
                </div>
              </Field>
            )}

            <div className="pt-2 border-t border-gray-100">
              <Toggle label="Breaking News" icon={FaBolt} checked={!!formData.is_breaking} onChange={() => setBreaking(!formData.is_breaking)} />
              {formData.is_breaking && (
                <div className="mt-3 space-y-1.5">
                  <Select
                    value={formData.breaking_duration || 24}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                      const hours = parseInt(e.target.value);
                      const until = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
                      setField({ breaking_duration: hours, breaking_until: until });
                    }}
                  >
                    <option value={1}>1 hour</option>
                    <option value={3}>3 hours</option>
                    <option value={6}>6 hours</option>
                    <option value={12}>12 hours</option>
                    <option value={24}>24 hours</option>
                    <option value={48}>48 hours</option>
                  </Select>
                  <p className="text-[10px] text-red-500 font-semibold">
                    Active until: {formData.breaking_until ? new Date(formData.breaking_until).toLocaleString() : 'Not set'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card title="Metadata" icon={FaGear} defaultOpen>
          <div className="space-y-4">
            <Field label="Pillar">
              <Select
                name="pillar"
                value={formData.pillar}
                disabled={!!user?.category}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setField({ pillar: e.target.value, section: PILLAR_SECTIONS[e.target.value]?.[0] || 'headlines' })}
              >
                {['news', 'sport', 'opinion', 'culture', 'lifestyle'].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Section">
              <Select name="section" value={formData.section} onChange={handleChange}>
                {currentSections.map((s: string) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Format">
              <Select name="format" value={formData.format || 'news'} onChange={handleChange}>
                {ARTICLE_FORMATS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Series">
              <Input name="series" value={formData.series || ''} onChange={handleChange} placeholder="Article series name" />
            </Field>

            <Field label="Display Type">
              <Select name="type" value={formData.type || 'standard'} onChange={handleChange}>
                <option value="standard">Standard</option>
                <option value="hero">Hero (Priority)</option>
                <option value="compact">Compact (Side)</option>
              </Select>
            </Field>

            <Field label="Tags">
              <TagInput value={formData.tags || ''} onChange={(v) => setField({ tags: v })} placeholder="Add tag and press Enter" />
            </Field>

            <Field label="Key Figures">
              <Textarea name="keyFigures" value={formData.keyFigures || ''} onChange={handleChange} rows={3} placeholder="Name - Position (one per line)" />
            </Field>

            <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <Toggle label="Live Blog" icon={FaClock} checked={!!formData.isLive} onChange={() => setField({ isLive: !formData.isLive })} />
              <Toggle label="Sensitive Content" icon={FaTriangleExclamation} checked={!!formData.isSensitive} onChange={() => setField({ isSensitive: !formData.isSensitive })} />
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
              <span>{wordCount} words</span>
              <span>{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
            </div>
          </div>
        </Card>

        <Card title="Media" icon={FaImage}>
          <div className="space-y-4">
            {formData.image ? (
              <div className="space-y-3">
                <div className="relative group rounded-xl overflow-hidden border border-gray-200 shadow-sm">
                  <img src={formData.image} alt="Featured" className="w-full aspect-video object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <label className="p-2 bg-white text-gray-800 rounded-full cursor-pointer hover:bg-gray-100">
                      <FaCloudArrowUp />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, 'image')} />
                    </label>
                    <button
                      onClick={() => setField({ image: '', imageCaption: '', imageCredit: '', imageAlt: '' })}
                      className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50"
                      type="button"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
                <FocalPointPicker
                  imageUrl={formData.image}
                  focalX={formData.imageFocalX}
                  focalY={formData.imageFocalY}
                  onChange={(x, y) => setField({ imageFocalX: x, imageFocalY: y })}
                />
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center aspect-video bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-all text-gray-400 hover:border-gray-300">
                <FaCloudArrowUp className="text-2xl mb-2" />
                <span className="text-[10px] font-bold uppercase">Upload Image</span>
                <input type="file" accept="image/*" className="hidden" onChange={(e) => onFileUpload(e, 'image')} />
              </label>
            )}

            <Field label="Image URL">
              <Input name="image" value={formData.image || ''} onChange={handleChange} placeholder="https://..." />
            </Field>

            <Field label={`Caption ${(formData.imageCaption || '').length}/255`}>
              <Input name="imageCaption" value={formData.imageCaption || ''} onChange={handleChange} maxLength={255} placeholder="What is happening in this image?" />
            </Field>

            <Field label="Credit">
              <Input name="imageCredit" value={formData.imageCredit || ''} onChange={handleChange} maxLength={128} placeholder="Photo: Photographer / Agency" />
            </Field>

            <Field label={`Alt Text ${(formData.imageAlt || '').length}/128`}>
              <Input name="imageAlt" value={formData.imageAlt || ''} onChange={handleChange} maxLength={128} placeholder="Description for screen readers" />
            </Field>

            <Field label="Video URL">
              <Input name="videoUrl" value={formData.videoUrl || ''} onChange={handleChange} placeholder="https://youtube.com/..." />
            </Field>
          </div>
        </Card>

        <Card title="SEO" icon={FaMagnifyingGlass}>
          <div className="space-y-4">
            <Field label="Slug (URL)">
              <div className="relative">
                <FaLink className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
                <Input name="slug" value={formData.slug || ''} onChange={handleChange} placeholder="article-slug" className="pl-9" />
              </div>
              <button
                type="button"
                onClick={() =>
                  setField({
                    slug: (formData.headline || '')
                      .toLowerCase()
                      .replace(/[^a-z0-9\s-]/g, '')
                      .trim()
                      .replace(/\s+/g, '-')
                      .slice(0, 80),
                  })
                }
                className="text-[10px] text-[#052962] hover:underline font-semibold mt-1"
              >
                Generate from headline
              </button>
            </Field>

            <Field label={`Meta Title ${(formData.metaTitle || formData.headline || '').length}/60`}>
              <Input name="metaTitle" value={formData.metaTitle || ''} onChange={handleChange} maxLength={60} placeholder={formData.headline || 'SEO title'} />
            </Field>

            <Field label={`Meta Description ${(formData.metaDescription || formData.trail || '').length}/160`}>
              <Textarea name="metaDescription" value={formData.metaDescription || ''} onChange={handleChange} maxLength={160} rows={3} placeholder={formData.trail || 'Search engine summary'} />
            </Field>

            {(formData.metaTitle || formData.headline) && (
              <div className="p-3 bg-white border border-gray-200 rounded-xl space-y-0.5">
                <p className="text-[10px] font-bold uppercase text-gray-400 mb-2">Google Preview</p>
                <p className="text-blue-700 text-xs font-medium line-clamp-1">{formData.metaTitle || formData.headline} | Yanci</p>
                <p className="text-green-700 text-[10px]">yanci.ng/article/{formData.slug || id || '...'}</p>
                <p className="text-gray-600 text-[10px] line-clamp-2">{formData.metaDescription || formData.trail || 'No description yet.'}</p>
              </div>
            )}

            <Field label={`OG Title ${(formData.ogTitle || '').length}/200`}>
              <Input name="ogTitle" value={formData.ogTitle || ''} onChange={handleChange} maxLength={200} placeholder={formData.metaTitle || formData.headline} />
            </Field>

            <Field label={`OG Description ${(formData.ogDescription || '').length}/300`}>
              <Textarea
                name="ogDescription"
                value={formData.ogDescription || ''}
                onChange={handleChange}
                maxLength={300}
                rows={3}
                placeholder={formData.metaDescription || formData.trail}
              />
            </Field>
          </div>
        </Card>

        <Card title="Social" icon={FaShareNodes}>
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-700">
              These fields control how the article appears on Facebook, Twitter and other social platforms.
            </div>

            <Field label={`Social Title ${(formData.ogTitle || '').length}/200`}>
              <Input name="ogTitle" value={formData.ogTitle || ''} onChange={handleChange} maxLength={200} placeholder={formData.metaTitle || formData.headline} />
            </Field>

            <Field label={`Social Description ${(formData.ogDescription || '').length}/300`}>
              <Textarea name="ogDescription" value={formData.ogDescription || ''} onChange={handleChange} maxLength={300} rows={3} placeholder={formData.metaDescription || formData.trail} />
            </Field>

            {(formData.ogTitle || formData.metaTitle || formData.headline) && (
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <p className="text-[10px] font-bold uppercase text-gray-400 px-3 pt-3 pb-1">Social Card Preview</p>
                {formData.image && (
                  <img
                    src={formData.image}
                    alt=""
                    className="w-full aspect-video object-cover"
                    style={{ objectPosition: `${formData.imageFocalX ?? 50}% ${formData.imageFocalY ?? 50}%` }}
                  />
                )}
                <div className="p-3 bg-gray-50">
                  <p className="text-[10px] text-gray-400 uppercase">yanci.ng</p>
                  <p className="text-xs font-bold text-gray-900 line-clamp-2 mt-0.5">{formData.ogTitle || formData.metaTitle || formData.headline}</p>
                  <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{formData.ogDescription || formData.metaDescription || formData.trail}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card title="Related Articles" icon={FaNewspaper}>
          <RelatedPicker
            articles={articles.filter((a: any) => String(a.id ?? a.$id) !== String(id))}
            value={formData.relatedArticles || ''}
            onChange={(v) => setField({ relatedArticles: v })}
          />
        </Card>

        <Card
          title="Pull Quotes"
          icon={FaQuoteLeft}
          badge={pullQuotes.length > 0 ? <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">{pullQuotes.length}</span> : null}
        >
          <div className="space-y-3">
            <p className="text-[11px] text-purple-700 bg-purple-50 border border-purple-100 rounded-lg p-3">
              Highlight text in the editor and click the quote icon in the floating toolbar to create a pull quote.
            </p>
            {pullQuotes.length > 0 ? (
              <div className="space-y-2">
                {pullQuotes.map((q: any) => (
                  <div key={q.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                    <p className="text-sm font-serif italic text-gray-700 leading-relaxed">&ldquo;{q.text}&rdquo;</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-gray-400">Position: {q.position}</p>
                      <button onClick={() => onRemovePullQuote(q.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" type="button">
                        <FaXmark className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-gray-400 py-4">No pull quotes yet.</p>
            )}
          </div>
        </Card>

        <Card
          title="Editorial Notes"
          icon={FaCircleInfo}
          badge={
            editorialNotes.filter((n: any) => !n.resolved).length > 0 ? (
              <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">
                {editorialNotes.filter((n: any) => !n.resolved).length}
              </span>
            ) : null
          }
        >
          <EditorialNotesPanel notes={editorialNotes} onAdd={onAddNote} onResolve={onResolveNote} onDelete={onDeleteNote} currentAuthor={user?.name || 'Unknown'} />
        </Card>

        <Card title="AI Tools" icon={FaWandMagicSparkles}>
          <div className="space-y-4">
            <button
              onClick={onGenerateAi}
              disabled={aiLoading}
              className="w-full py-2.5 bg-[#052962] text-white text-xs font-bold rounded-lg hover:bg-[#052962]/90 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
              type="button"
            >
              {aiLoading ? 'Generating...' : 'Generate AI Suggestions'}
            </button>

            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Quick Actions</p>
              <button
                onClick={onRunGrammar}
                disabled={checkingGrammar || !formData.body}
                className="w-full py-2 bg-gray-50 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 border border-gray-200"
                type="button"
              >
                Grammar & Style Check
              </button>
              {grammarResult && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Score</span>
                    <span className={`text-sm font-black ${grammarResult.score >= 80 ? 'text-green-600' : grammarResult.score >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {grammarResult.score}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                    <div
                      className={`h-1.5 rounded-full ${grammarResult.score >= 80 ? 'bg-green-500' : grammarResult.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                      style={{ width: `${grammarResult.score}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onTranslate('ha')}
                  disabled={translating || !formData.headline}
                  className="py-2 bg-green-50 text-green-700 text-xs font-bold rounded-lg hover:bg-green-100 disabled:opacity-40 transition-colors border border-green-200"
                  type="button"
                >
                  → Hausa
                </button>
                <button
                  onClick={() => onTranslate('en')}
                  disabled={translating || !formData.headline}
                  className="py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 disabled:opacity-40 transition-colors border border-blue-200"
                  type="button"
                >
                  → English
                </button>
              </div>

              <button
                onClick={onGenerateAltText}
                disabled={altTextGenerating || !formData.image}
                className="w-full py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 border border-blue-200"
                type="button"
              >
                Generate Alt Text
              </button>

              <button
                onClick={onScoreHeadlines}
                disabled={scoringHeadlines || !formData.body}
                className="w-full py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg hover:bg-indigo-100 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 border border-indigo-200"
                type="button"
              >
                Score Headlines
              </button>
              {headlineScores.length > 0 && (
                <div className="space-y-1.5">
                  {headlineScores.slice(0, 3).map((h: any, i: number) => (
                    <div
                      key={i}
                      className={`p-2 rounded-lg text-xs border ${h.score >= 80 ? 'bg-green-50 border-green-200' : h.score >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`font-bold ${h.score >= 80 ? 'text-green-700' : h.score >= 60 ? 'text-amber-700' : 'text-red-700'}`}>{h.score}/100</span>
                      </div>
                      <p className="font-medium text-gray-800">{h.headline}</p>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={onAnalyzeDiscover}
                disabled={analyzingDiscover || !formData.body}
                className="w-full py-2 bg-orange-50 text-orange-700 text-xs font-bold rounded-lg hover:bg-orange-100 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 border border-orange-200"
                type="button"
              >
                Analyze for Discover
              </button>
              {discoverAnalysis && (
                <div className="p-2 bg-orange-50 rounded-lg border border-orange-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700">Discover Score</span>
                    <span className={`text-sm font-black ${discoverAnalysis.score >= 70 ? 'text-green-600' : discoverAnalysis.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                      {discoverAnalysis.score}/100
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={onRepurpose}
                disabled={repurposing || !formData.body}
                className="w-full py-2 bg-pink-50 text-pink-700 text-xs font-bold rounded-lg hover:bg-pink-100 disabled:opacity-40 transition-colors flex items-center justify-center gap-2 border border-pink-200"
                type="button"
              >
                Repurpose Content
              </button>
              {repurposedContent && (
                <div className="space-y-1.5">
                  {[
                    { label: 'Twitter Thread', value: repurposedContent.twitter_thread?.join('\n\n') },
                    { label: 'WhatsApp', value: repurposedContent.whatsapp_broadcast },
                    { label: 'Instagram', value: repurposedContent.instagram_caption },
                    { label: 'Facebook', value: repurposedContent.facebook_post },
                  ]
                    .filter((item) => item.value)
                    .map((item) => (
                      <div key={item.label} className="p-2 bg-gray-50 rounded-lg">
                        <p className="text-[10px] font-bold text-gray-500">{item.label}</p>
                        <p className="text-[11px] text-gray-700 line-clamp-3">{item.value}</p>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        <Card title="Internal Links" icon={FaLink}>
          <div className="space-y-3">
            <button
              onClick={onOpenLinkPicker}
              className="w-full py-2 bg-[#052962]/5 text-[#052962] text-xs font-bold rounded-lg hover:bg-[#052962]/10 transition-colors flex items-center justify-center gap-2"
              type="button"
            >
              <FaLink /> Open Link Picker
            </button>
          </div>
        </Card>

        <Card title="Corrections" icon={FaTriangleExclamation}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">Corrections & Clarifications</p>
              <span className="text-[10px] text-gray-400">{(formData.corrections || []).length} item(s)</span>
            </div>
            {(formData.corrections || []).length === 0 ? (
              <p className="text-[10px] text-gray-400">No corrections or clarifications.</p>
            ) : (
              <div className="space-y-2">
                {(formData.corrections || []).map((c: any, i: number) => (
                  <div key={i} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg group">
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border-blue-200 border">{c.type || 'correction'}</span>
                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">{c.text}</p>
                    </div>
                    <button
                      onClick={() => {
                        const next = (formData.corrections || []).filter((_: any, idx: number) => idx !== i);
                        setField({ corrections: next });
                      }}
                      className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      type="button"
                    >
                      <FaXmark className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <AddCorrectionInline onAdd={(c: any) => setField({ corrections: [...(formData.corrections || []), c] })} />
          </div>
        </Card>

        {isEditing && (
          <Card title="Revision History" icon={FaClockRotateLeft}>
            <RevisionHistoryInline
              articleId={id!}
              currentData={formData}
              onRestore={(snapshot: any) => {
                try {
                  const data = typeof snapshot === 'string' ? JSON.parse(snapshot) : snapshot;
                  setFormData((prev: Record<string, any>) => ({ ...prev, ...data }));
                  setIsDirty(true);
                } catch (e) {
                  console.error('Failed to restore revision:', e);
                }
              }}
            />
          </Card>
        )}
      </div>
    </aside>
  );
};

const AddCorrectionInline = ({ onAdd }: { onAdd: (c: any) => void }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [draft, setDraft] = useState({ type: 'correction', text: '' });
  if (!isAdding) {
    return (
      <button onClick={() => setIsAdding(true)} className="text-[10px] font-bold text-[#c59d5f] hover:text-[#b08a4f] flex items-center gap-1" type="button">
        + Add
      </button>
    );
  }
  return (
    <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })} className="w-full text-xs p-2 border border-gray-200 rounded bg-white">
        <option value="correction">Correction</option>
        <option value="clarification">Clarification</option>
        <option value="apology">Apology</option>
      </select>
      <textarea
        value={draft.text}
        onChange={(e) => setDraft({ ...draft, text: e.target.value })}
        placeholder="Describe the correction or clarification..."
        rows={2}
        className="w-full text-xs p-2 border border-gray-200 rounded resize-none"
      />
      <div className="flex justify-end gap-2">
        <button onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded" type="button">
          Cancel
        </button>
        <button
          onClick={() => {
            if (!draft.text.trim()) return;
            onAdd({ ...draft, date: new Date().toISOString() });
            setDraft({ type: 'correction', text: '' });
            setIsAdding(false);
          }}
          disabled={!draft.text.trim()}
          className="px-3 py-1.5 text-xs font-bold text-white bg-[#0f3036] hover:bg-[#1a454c] rounded disabled:opacity-50"
          type="button"
        >
          Add
        </button>
      </div>
    </div>
  );
};

const RevisionHistoryInline = ({ articleId, currentData, onRestore }: { articleId: string; currentData: any; onRestore: (snap: any) => void }) => {
  const [revisions, setRevisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!articleId) return;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/revisions?articleId=${encodeURIComponent(articleId)}`);
        const data = await res.json().catch(() => ({}));
        const docs = Array.isArray(data.revisions) ? data.revisions : Array.isArray(data.documents) ? data.documents : [];
        setRevisions(docs.map((d: any) => ({ ...d, diff: typeof d.diff === 'string' ? JSON.parse(d.diff) : d.diff || d.previous_json })));
      } catch (e) {
        console.error('Failed to load revisions:', e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [articleId]);

  if (loading) return <div className="flex items-center justify-center py-8 text-gray-400 text-sm">Loading...</div>;
  if (revisions.length === 0)
    return <div className="text-center py-8 text-gray-400 text-sm">No revisions yet. Revisions are saved automatically when you update the article.</div>;

  const timeAgo = (dateStr: string) => {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return hrs + 'h ago';
    return Math.floor(hrs / 24) + 'd ago';
  };

  return (
    <div className="space-y-2">
      {revisions.map((rev: any) => (
        <div key={rev.$id || rev.id} className="border border-gray-100 rounded-lg overflow-hidden">
          <button
            onClick={() => setExpanded(expanded === (rev.$id || rev.id) ? null : rev.$id || rev.id)}
            className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
            type="button"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#0f3036]/10 text-[#0f3036] flex items-center justify-center text-xs font-bold">
                {(rev.author_name || rev.edited_by || '?').charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-800">{rev.author_name || rev.edited_by || 'Unknown'}</p>
                <p className="text-xs text-gray-400">{timeAgo(rev.$createdAt || rev.edited_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{rev.change_type || 'edit'}</span>
              {expanded === (rev.$id || rev.id) ? <FaChevronUp className="w-3 h-3 text-gray-400" /> : <FaChevronDown className="w-3 h-3 text-gray-400" />}
            </div>
          </button>
          {expanded === (rev.$id || rev.id) && (
            <div className="px-3 pb-3 border-t border-gray-50">
              {rev.message && <p className="text-sm text-gray-600 mt-2 mb-2">{rev.message}</p>}
              <button
                onClick={() => {
                  if (!window.confirm('Restore this version? Current changes will be saved as a new revision.')) return;
                  onRestore(rev.snapshot || rev.previous_json);
                }}
                className="mt-3 flex items-center gap-1.5 text-xs font-bold text-[#c59d5f] hover:text-[#b08a4f] transition-colors"
                type="button"
              >
                Restore this version
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default EditorSidebar;
