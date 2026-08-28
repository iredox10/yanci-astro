import { FaDesktop, FaTabletScreenButton, FaMobileScreenButton } from 'react-icons/fa6';

interface Props {
  formData: Record<string, any>;
  wordCount: number;
  pullQuotes: Array<{ id: string; text: string }>;
  previewDevice: string;
  setPreviewDevice: (d: string) => void;
}

const ArticlePreview = ({ formData, wordCount, pullQuotes, previewDevice, setPreviewDevice }: Props) => {
  const devices = [
    { device: 'mobile', label: 'Mobile', icon: FaMobileScreenButton, width: '375px' },
    { device: 'tablet', label: 'Tablet', icon: FaTabletScreenButton, width: '768px' },
    { device: 'desktop', label: 'Desktop', icon: FaDesktop, width: '100%' },
  ];

  const pillarColor =
    formData.pillar === 'sport'
      ? '#0084c6'
      : formData.pillar === 'culture'
        ? '#a1845c'
        : formData.pillar === 'lifestyle'
          ? '#bb3b80'
          : formData.pillar === 'opinion'
            ? '#e05e00'
            : '#c70000';

  return (
    <section className="overflow-y-auto bg-[#f6f6f6] border-l border-gray-200 flex flex-col flex-1">
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider hidden sm:block">Preview</p>
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5 mx-auto sm:mx-0">
          {devices.map(({ device, label, icon: Icon }) => (
            <button
              key={device}
              onClick={() => setPreviewDevice(device)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold flex items-center gap-1.5 transition-all ${previewDevice === device ? 'bg-white text-[#052962] shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              title={label}
              type="button"
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
        <div className="w-16 hidden sm:block" />
      </div>

      <div className="flex-1 flex justify-center p-4 md:p-6 overflow-y-auto">
        <div
          className="bg-white shadow-xl rounded-lg overflow-hidden transition-all duration-300 min-h-[600px]"
          style={{
            width: previewDevice === 'mobile' ? '375px' : previewDevice === 'tablet' ? '768px' : '100%',
            maxWidth: '100%',
          }}
        >
          <article className="max-w-[720px] mx-auto p-6 md:p-10 space-y-6">
            {formData.kicker && (
              <p className="text-[11px] font-bold uppercase tracking-[0.15em]" style={{ color: pillarColor }}>
                {formData.kicker}
              </p>
            )}

            <h1 className="text-3xl md:text-5xl font-serif font-black text-[#121212] leading-tight">{formData.headline || 'Untitled Article'}</h1>

            {formData.subheading && <p className="text-lg md:text-xl font-serif text-gray-500 leading-relaxed">{formData.subheading}</p>}

            {formData.trail && <p className="text-base text-gray-600 italic border-l-4 border-gray-200 pl-4 font-serif">{formData.trail}</p>}

            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <div className="w-9 h-9 rounded-full bg-[#052962] text-white flex items-center justify-center text-sm font-bold">
                {formData.author?.[0] || 'Y'}
              </div>
              <div>
                <p className="text-xs font-bold text-[#121212]">{formData.author || 'Yanci'}</p>
                <p className="text-[10px] text-gray-500">
                  {new Date().toLocaleDateString('ha-NG', { day: 'numeric', month: 'long', year: 'numeric' })} ·{' '}
                  {Math.max(1, Math.ceil(wordCount / 200))} min read
                </p>
              </div>
            </div>

            {formData.image && (
              <figure className="space-y-2">
                <img
                  src={formData.image}
                  alt={formData.imageAlt || formData.imageCaption || ''}
                  className="w-full rounded-lg object-cover"
                  style={{ maxHeight: '500px', objectPosition: `${formData.imageFocalX ?? 50}% ${formData.imageFocalY ?? 50}%` }}
                />
                {(formData.imageCaption || formData.imageCredit) && (
                  <figcaption className="text-xs text-gray-500 font-sans">
                    {formData.imageCaption}
                    {formData.imageCaption && formData.imageCredit && ' '}
                    {formData.imageCredit && <span className="text-gray-400">Photo: {formData.imageCredit}</span>}
                  </figcaption>
                )}
              </figure>
            )}

            <div
              className="prose prose-lg max-w-none font-serif text-[#121212] leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formData.body || '<p class="text-gray-300 italic">Start writing to see the preview...</p>' }}
            />

            {pullQuotes.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-gray-100">
                <p className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Pull Quotes</p>
                {pullQuotes.map((q) => (
                  <blockquote key={q.id} className="border-l-4 border-[#c59d5f] pl-4 py-2 my-2">
                    <p className="text-lg font-serif italic text-[#121212] leading-relaxed">&ldquo;{q.text}&rdquo;</p>
                  </blockquote>
                ))}
              </div>
            )}

            {formData.tags && (
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
                {String(formData.tags)
                  .split(',')
                  .map((t: string) => t.trim())
                  .filter(Boolean)
                  .map((tag: string) => (
                    <span key={tag} className="text-[11px] font-bold text-[#052962] bg-gray-100 px-2.5 py-1 rounded-full">
                      {tag}
                    </span>
                  ))}
              </div>
            )}
          </article>
        </div>
      </div>
    </section>
  );
};

export default ArticlePreview;
