import React, { useState, useEffect } from 'react';
import { FaNewspaper, FaEnvelope, FaTrash, FaMagnifyingGlass, FaSpinner, FaDownload, FaEye, FaChartLine, FaWandMagicSparkles, FaCopy, FaXmark, FaArrowRight } from 'react-icons/fa6';

const STORAGE_KEY = 'yanci_newsletter_subscribers';

const sampleSubscribers = [
  { id: 1, email: 'musa@example.com', subscribedAt: '2025-01-15T10:30:00Z', status: 'active', opens: 24 },
  { id: 2, email: 'aisha@example.com', subscribedAt: '2025-02-20T14:15:00Z', status: 'active', opens: 18 },
  { id: 3, email: 'ibrahim@example.com', subscribedAt: '2025-03-05T09:00:00Z', status: 'active', opens: 31 },
  { id: 4, email: 'fatima@example.com', subscribedAt: '2025-03-10T16:45:00Z', status: 'unsubscribed', opens: 5 },
  { id: 5, email: 'abdullahi@example.com', subscribedAt: '2025-03-22T11:20:00Z', status: 'active', opens: 12 },
];

interface Props {
  initialSubscribers?: any[];
  initialArticles?: any[];
}

export default function AdminNewsletterClient({ initialSubscribers, initialArticles }: Props) {
  const [subscribers, setSubscribers] = useState<any[]>(() => {
    if (initialSubscribers && initialSubscribers.length > 0) {
      return initialSubscribers.map((s: any) => ({
        id: s.$id ?? s.id,
        $id: s.$id,
        email: s.email,
        subscribedAt: s.subscribed_at ?? s.subscribedAt ?? s.$createdAt,
        status: (s.status === 'subscribed' ? 'active' : s.status) ?? 'active',
        opens: s.opens ?? 0,
      }));
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try { return JSON.parse(saved); } catch {}
      }
    }
    return sampleSubscribers;
  });

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState<Set<any>>(new Set());
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('subscribers');
  const [curating, setCurating] = useState(false);
  const [curatedNewsletter, setCuratedNewsletter] = useState<any>(null);
  const [newsletterTopic, setNewsletterTopic] = useState('');

  // keep localStorage in sync like original
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(subscribers)); } catch {}
  }, [subscribers]);

  // hydrate from prop if provided after mount (SSR -> client)
  useEffect(() => {
    if (initialSubscribers && initialSubscribers.length > 0) {
      const mapped = initialSubscribers.map((s: any) => ({
        id: s.$id ?? s.id,
        $id: s.$id,
        email: s.email,
        subscribedAt: s.subscribed_at ?? s.subscribedAt ?? s.$createdAt,
        status: (s.status === 'subscribed' ? 'active' : s.status) ?? 'active',
        opens: s.opens ?? 0,
      }));
      // only override if we haven't added local subscribers? keep as is for pixel identical - just set
      // To preserve original sample fallback when server empty, don't override if mapped empty
      setSubscribers(mapped);
    }
  }, [initialSubscribers]);

  const filtered = subscribers.filter(sub => {
    const matchesSearch = String(sub.email).toLowerCase().includes(search.toLowerCase());
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const activeCount = subscribers.filter(s => s.status === 'active').length;
  const totalCount = subscribers.length;
  const totalOpens = subscribers.reduce((sum, s) => sum + (s.opens || 0), 0);

  const handleDelete = (id: any) => {
    if (window.confirm('Share wannan subscriber?')) {
      // try server delete if $id exists
      const target = subscribers.find(s => s.id === id);
      if (target?.$id) {
        fetch(`/api/admin/newsletter/${encodeURIComponent(String(target.$id))}`, { method: 'DELETE' }).catch(()=>{});
      }
      setSubscribers(prev => prev.filter(s => s.id !== id));
      setSelected(prev => { const next = new Set(prev); next.delete(id); return next; });
    }
  };

  const handleBulkDelete = () => {
    if (selected.size === 0 || !window.confirm(`Share ${selected.size} subscribers?`)) return;
    selected.forEach((id: any) => {
      const t = subscribers.find(s => s.id === id);
      if (t?.$id) fetch(`/api/admin/newsletter/${encodeURIComponent(String(t.$id))}`, { method: 'DELETE' }).catch(()=>{});
    });
    setSubscribers(prev => prev.filter(s => !selected.has(s.id)));
    setSelected(new Set());
  };

  const handleToggleStatus = (id: any) => {
    setSubscribers(prev => prev.map(s =>
      s.id === id ? { ...s, status: s.status === 'active' ? 'unsubscribed' : 'active' } : s
    ));
    const t = subscribers.find(s => s.id === id);
    if (t?.$id) {
      const newStatus = t.status === 'active' ? 'unsubscribed' : 'subscribed';
      fetch(`/api/admin/newsletter/${encodeURIComponent(String(t.$id))}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ status: newStatus }) }).catch(()=>{});
    }
  };

  const handleExport = () => {
    setExporting(true);
    setTimeout(() => {
      const csv = [
        'Email,Status,Subscribed At,Opens',
        ...subscribers.map(s => `${s.email},${s.status},${s.subscribedAt},${s.opens}`),
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'yanci_newsletter_subscribers.csv';
      a.click();
      URL.revokeObjectURL(url);
      setExporting(false);
    }, 500);
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(s => s.id)));
    }
  };

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-NG', { year: 'numeric', month: 'short', day: 'numeric' });

  const runNewsletterCuration = async () => {
    // try server AI endpoint; fallback to mock like original geminiService
    setCurating(true);
    try {
      // collect recent articles from prop or empty
      const recentArticles = (initialArticles ?? []).filter((a: any) => (a.status ?? 'published') === 'published').slice(0, 20);
      // try calling an AI endpoint; if not available, craft mock response
      // Attempt generic AI call
      let curated: any = null;
      try {
        const res = await fetch('/api/ai/summarize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: JSON.stringify(recentArticles.slice(0,5).map((a:any)=> a.headline ?? a.title).join('\n')) + (newsletterTopic ? `\nTopic: ${newsletterTopic}` : '') }),
        });
        if (res.ok) {
          const data = await res.json().catch(()=>null);
          if (data?.text) {
            curated = {
              subject: `Yanci Newsletter — ${newsletterTopic || 'Labaran Mako'}`,
              preview_text: data.text.slice(0, 120),
              body: data.text,
              sections: recentArticles.slice(0,3).map((a:any)=> ({ title: a.section ?? 'Labarai', content: a.trail ?? '', articles: [{ headline: a.headline ?? a.title ?? '' }] })),
              html: `<html><body><h1>${newsletterTopic || 'Yanci Newsletter'}</h1><p>${data.text}</p></body></html>`,
            };
          }
        }
      } catch {}
      if (!curated) {
        // fallback mock curated newsletter
        curated = {
          subject: `Yanci — ${newsletterTopic || 'Sabbin Labarai na Mako'}`,
          preview_text: 'Takaitaccen bayani daga labaran da muka zaba muku na musamman.',
          body: `Assalamu alaikum,\n\nGa takaitaccen wasiku na Yanci:\n\n` + recentArticles.slice(0,3).map((a:any, i:number)=> `${i+1}. ${a.headline || a.title} — ${a.trail || ''}`).join('\n') + `\n\nMun gode da kasancewa tare da mu.`,
          sections: recentArticles.slice(0,3).map((a:any)=> ({ title: a.section || 'Labarai', content: a.trail || 'Babu bayani', articles: [{ headline: a.headline || a.title || '' }] })),
          html: `<html><body><h1>Yanci Newsletter</h1><p>Mock curated newsletter for topic: ${newsletterTopic || 'general'}</p></body></html>`,
        };
      }
      setCuratedNewsletter(curated);
    } catch (e: any) {
      alert('Newsletter curation failed: ' + (e.message ?? 'unknown'));
    } finally {
      setCurating(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FaNewspaper className="text-[#c59d5f]" /> Newsletter
          </h2>
          <p className="text-sm text-gray-500 mt-1">Gudanar da wasiku da masu rijista na Yanci</p>
        </div>
        {activeTab === 'subscribers' && (
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg flex items-center gap-2 hover:bg-gray-50 font-bold text-sm disabled:opacity-50"
          >
            {exporting ? <FaSpinner className="animate-spin" /> : <FaDownload className="w-4 h-4" />} Export CSV
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('subscribers')}
          className={`py-3 px-6 text-sm font-bold transition-colors ${
            activeTab === 'subscribers' ? 'text-[#0f3036] border-b-2 border-[#c59d5f]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          Subscribers
        </button>
        <button
          onClick={() => setActiveTab('curator')}
          className={`py-3 px-6 text-sm font-bold transition-colors flex items-center gap-2 ${
            activeTab === 'curator' ? 'text-[#0f3036] border-b-2 border-[#c59d5f]' : 'text-gray-400 hover:text-gray-600'
          }`}
        >
          <FaWandMagicSparkles className="w-3.5 h-3.5" /> AI Curator
        </button>
      </div>

      {activeTab === 'subscribers' && (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><FaEnvelope className="text-blue-600" /></div>
            <span className="text-sm text-gray-500 font-medium">Total Subscribers</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{totalCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center"><FaChartLine className="text-green-600" /></div>
            <span className="text-sm text-gray-500 font-medium">Active</span>
          </div>
          <p className="text-3xl font-black text-green-600">{activeCount}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><FaEye className="text-purple-600" /></div>
            <span className="text-sm text-gray-500 font-medium">Total Opens</span>
          </div>
          <p className="text-3xl font-black text-gray-900">{totalOpens.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Nema subscriber..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#c59d5f] text-sm"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'unsubscribed'].map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2.5 rounded-lg text-sm font-bold capitalize transition-colors ${
                filterStatus === status
                  ? 'bg-[#0f3036] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="bg-[#0f3036] text-white p-3 rounded-lg flex items-center justify-between">
          <span className="text-sm font-bold">{selected.size} selected</span>
          <button onClick={handleBulkDelete} className="text-red-300 hover:text-red-100 text-sm font-bold flex items-center gap-2">
            <FaTrash className="w-3 h-3" /> Delete Selected
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
              <tr>
                <th className="p-3 text-left">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selected.size === filtered.length}
                    onChange={toggleAll}
                    className="w-4 h-4"
                  />
                </th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-center">Status</th>
                <th className="p-3 text-center">Subscribed</th>
                <th className="p-3 text-center">Opens</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((sub: any) => (
                <tr key={sub.id} className={`hover:bg-gray-50 ${selected.has(sub.id) ? 'bg-blue-50' : ''}`}>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selected.has(sub.id)}
                      onChange={() => {
                        setSelected(prev => {
                          const next = new Set(prev);
                          if (next.has(sub.id)) next.delete(sub.id);
                          else next.add(sub.id);
                          return next;
                        });
                      }}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="p-3 font-medium text-gray-900">{sub.email}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      sub.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="p-3 text-center text-gray-500">{formatDate(sub.subscribedAt)}</td>
                  <td className="p-3 text-center font-bold">{sub.opens || 0}</td>
                  <td className="p-3 text-center">
                    <div className="flex gap-1 justify-center">
                      <button onClick={() => handleToggleStatus(sub.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Toggle Status">
                        {sub.status === 'active' ? '⏸️' : '▶️'}
                      </button>
                      <button onClick={() => handleDelete(sub.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Delete">
                        <FaTrash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-12 text-center text-gray-400">
                    <FaEnvelope className="mx-auto text-3xl mb-2 opacity-30" />
                    Babu subscribers a wannan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      {activeTab === 'curator' && (
        <div className="space-y-6">
          {/* Curator Controls */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
              <FaWandMagicSparkles className="text-[#c59d5f]" /> AI Newsletter Curator
            </h3>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <input
                type="text"
                value={newsletterTopic}
                onChange={e => setNewsletterTopic(e.target.value)}
                placeholder="Optional: Specify a topic (e.g., 'Politics', 'Sports this week')"
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#c59d5f] text-sm"
              />
              <button
                onClick={runNewsletterCuration}
                disabled={curating}
                className="bg-[#0f3036] text-white px-6 py-2.5 rounded-lg font-bold text-sm hover:bg-[#1a454c] disabled:opacity-50 flex items-center gap-2"
              >
                {curating ? <FaSpinner className="animate-spin" /> : <FaWandMagicSparkles />}
                {curating ? 'Curating...' : 'Curate Newsletter'}
              </button>
            </div>
            <p className="text-xs text-gray-400">Uses your latest published articles to generate a newsletter draft.</p>
          </div>

          {/* Curated Result */}
          {curatedNewsletter && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#0f3036]/5">
                <h3 className="text-sm font-bold text-gray-700">Curated Newsletter Draft</h3>
                <button
                  onClick={() => navigator.clipboard.writeText(curatedNewsletter.html || curatedNewsletter.subject + '\n\n' + curatedNewsletter.body)}
                  className="text-xs text-[#0f3036] hover:underline font-bold flex items-center gap-1"
                >
                  <FaCopy className="w-3 h-3" /> Copy All
                </button>
              </div>
              <div className="p-5 space-y-4">
                {curatedNewsletter.subject && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">Subject Line</p>
                    <p className="text-sm font-bold text-gray-900">{curatedNewsletter.subject}</p>
                  </div>
                )}
                {curatedNewsletter.preview_text && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">Preview Text</p>
                    <p className="text-sm text-gray-700">{curatedNewsletter.preview_text}</p>
                  </div>
                )}
                {curatedNewsletter.sections?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-2">Sections</p>
                    <div className="space-y-3">
                      {curatedNewsletter.sections.map((sec: any, i: number) => (
                        <div key={i} className="p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs font-bold text-[#0f3036] mb-1">{sec.title}</p>
                          <p className="text-sm text-gray-700">{sec.content}</p>
                          {sec.articles?.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {sec.articles.map((a: any, j: number) => (
                                <div key={j} className="flex items-start gap-2 text-xs">
                                  <FaArrowRight className="w-2.5 h-2.5 text-[#c59d5f] shrink-0 mt-0.5" />
                                  <span className="text-gray-600">{a.headline}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {curatedNewsletter.body && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">Body</p>
                    <div className="text-sm text-gray-700 whitespace-pre-wrap">{curatedNewsletter.body}</div>
                  </div>
                )}
                {curatedNewsletter.html && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-1">HTML Version</p>
                    <div className="p-3 bg-gray-900 text-green-400 text-xs font-mono rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                      {curatedNewsletter.html}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {!curatedNewsletter && !curating && (
            <div className="text-center py-16">
              <FaEnvelope className="w-12 h-12 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">Click "Curate Newsletter" to generate a draft from your latest articles.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
