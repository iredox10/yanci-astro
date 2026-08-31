import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FaArrowLeft, FaPaperPlane, FaImage, FaTrash, FaStar,
  FaThumbtack, FaGear, FaXmark, FaSpinner,
  FaCheck, FaChevronUp, FaChevronDown, FaMagnifyingGlass, FaPencil,
  FaBookOpen,
} from 'react-icons/fa6';

interface LiveUpdate {
  id: string | number;
  time?: string;
  title?: string;
  content?: string;
  images?: string[];
  image?: string;
  isKeyEvent?: boolean;
  isPinned?: boolean;
  isSummary?: boolean;
  pinned?: boolean;
  type?: string;
  author?: string;
  timestamp?: string | number;
}

interface Article {
  $id?: string;
  id?: string | number;
  headline?: string;
  image?: string;
  isLive?: boolean;
  liveUpdates?: LiveUpdate[] | string;
  videoUrl?: string;
  keyFigures?: string;
  mapEmbedUrl?: string;
  pillar?: string;
  section?: string;
  kicker?: string;
  author?: string;
}

interface Props {
  article: Article;
  userName?: string | null;
}

function parseLiveUpdates(raw: unknown): LiveUpdate[] {
  if (Array.isArray(raw)) {
    return raw.map((u) => {
      if (typeof u === 'string') {
        try { return JSON.parse(u); } catch { return null; }
      }
      return u;
    }).filter((u): u is LiveUpdate => u !== null && typeof u === 'object');
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed as LiveUpdate[] : [];
    } catch { return []; }
  }
  return [];
}

export default function AdminLiveConsole({ article: initialArticle, userName }: Props) {
  const [article, setArticle] = useState<Article>(initialArticle);
  const [updateText, setUpdateText] = useState('');
  const [updateTitle, setUpdateTitle] = useState('');
  const [isKeyEvent, setIsKeyEvent] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [isSummary, setIsSummary] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'feed'>('editor');
  const [searchQuery, setSearchQuery] = useState('');
  const [editingUpdate, setEditingUpdate] = useState<LiveUpdate | null>(null);
  const [editText, setEditText] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);
  const feedRef = useRef<HTMLDivElement | null>(null);

  // Cropper State (simplified – upload without real crop)
  const [zoom, setZoom] = useState(1);
  const [croppingImage, setCroppingImage] = useState<string | null>(null);
  const [showCropper, setShowCropper] = useState(false);
  const [croppingTarget, setCroppingTarget] = useState<'update' | 'edit'>('update');
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const [showSettings, setShowSettings] = useState(false);
  const [settingsData, setSettingsData] = useState<{ videoUrl: string; keyFigures: string; mapEmbedUrl?: string }>({
    videoUrl: (initialArticle as any).videoUrl || '',
    keyFigures: (initialArticle as any).keyFigures || '',
    mapEmbedUrl: (initialArticle as any).mapEmbedUrl || '',
  });

  useEffect(() => {
    setSettingsData({
      videoUrl: (article as any).videoUrl || '',
      keyFigures: (article as any).keyFigures || '',
      mapEmbedUrl: (article as any).mapEmbedUrl || '',
    });
  }, [article]);

  const liveUpdates = useMemo(() => parseLiveUpdates((article as any).liveUpdates), [article]);

  if (!article) return null;

  const handleSaveSettings = async () => {
    try {
      const id = String(article.$id ?? article.id ?? '');
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsData),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || 'Save failed');
      setArticle((prev) => ({ ...prev, ...settingsData } as Article));
      setShowSettings(false);
    } catch (e: any) {
      alert(e.message || 'Failed to save settings');
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'update' | 'edit' = 'update') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localPreviewUrl = URL.createObjectURL(file);
    setCroppingImage(localPreviewUrl);
    setPendingFile(file);
    setCroppingTarget(target);
    setShowCropper(true);
    e.target.value = '';
  };

  const handleCropConfirm = async () => {
    if (!pendingFile) {
      setShowCropper(false);
      setCroppingImage(null);
      return;
    }
    try {
      setUploading(true);
      // Simplified: upload original file without canvas crop (preserve UI)
      const fd = new FormData();
      fd.append('file', pendingFile);
      const res = await fetch('/api/admin/media', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.message || 'Upload failed');
      const fileUrl = data.url;
      if (croppingTarget === 'edit') {
        setEditImages((prev) => [...prev, fileUrl]);
      } else {
        setImages((prev) => [...prev, fileUrl]);
      }
      setShowCropper(false);
      setCroppingImage(null);
      setPendingFile(null);
    } catch (e) {
      console.error(e);
      alert('Failed to crop/upload image');
    } finally {
      setUploading(false);
    }
  };

  const handlePost = async () => {
    if (!updateText.trim()) return;
    const id = String(article.$id ?? article.id ?? '');
    const newUpdate: Record<string, unknown> = {
      id: `u${Date.now()}`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      title: updateTitle,
      content: updateText,
      images: images.length > 0 ? images : [],
      image: images[0] || undefined,
      isKeyEvent,
      isPinned,
      isSummary,
      pinned: isPinned,
      type: isKeyEvent ? 'key-event' : 'update',
      author: userName || 'Editor',
      timestamp: Date.now(),
    };
    try {
      const res = await fetch('/api/admin/articles/live', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: id, update: newUpdate }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.message || 'Post failed');
      // optimistic update + reload
      const current = parseLiveUpdates((article as any).liveUpdates);
      const merged = [newUpdate as unknown as LiveUpdate, ...current];
      setArticle((prev) => ({ ...prev, liveUpdates: merged } as Article));
      setUpdateText('');
      setUpdateTitle('');
      setImages([]);
      setIsKeyEvent(false);
      setIsPinned(false);
      setIsSummary(false);
      if (typeof window !== 'undefined' && window.innerWidth < 1024) setActiveTab('feed');
    } catch (e: any) {
      alert(e.message || 'Failed to post');
    }
  };

  const handleDelete = async (updateId: string | number) => {
    if (!window.confirm('Delete this update?')) return;
    const id = String(article.$id ?? article.id ?? '');
    try {
      const res = await fetch('/api/admin/articles/live', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: id, updateId: String(updateId) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.message || 'Delete failed');
      const current = parseLiveUpdates((article as any).liveUpdates);
      const remaining = current.filter((u) => String(u.id) !== String(updateId));
      setArticle((prev) => ({ ...prev, liveUpdates: remaining } as Article));
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    }
  };

  const handleStartEdit = (update: LiveUpdate) => {
    setEditingUpdate(update);
    setEditTitle(update.title || '');
    setEditText(update.content || '');
    setEditImages(update.images || (update.image ? [update.image] : []));
  };

  const handleSaveEdit = async () => {
    if (!editText.trim() || !editingUpdate) return;
    const id = String(article.$id ?? article.id ?? '');
    const updated: LiveUpdate = {
      ...editingUpdate,
      title: editTitle,
      content: editText,
      images: editImages,
      image: editImages[0],
    };
    const current = parseLiveUpdates((article as any).liveUpdates);
    const updates = current.map((u) => (String(u.id) === String(editingUpdate.id) ? updated : u));
    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liveUpdates: updates.map((u) => JSON.stringify(u)) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || 'Update failed');
      setArticle((prev) => ({ ...prev, liveUpdates: updates } as Article));
      setEditingUpdate(null);
    } catch (e: any) {
      alert(e.message || 'Save failed');
    }
  };

  const handleMoveUpdate = async (updateId: string | number, direction: 'up' | 'down') => {
    const current = [...parseLiveUpdates((article as any).liveUpdates)];
    const idx = current.findIndex((u) => String(u.id) === String(updateId));
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= current.length) return;
    const tmp = current[idx];
    current[idx] = current[targetIdx];
    current[targetIdx] = tmp;
    const id = String(article.$id ?? article.id ?? '');
    try {
      const res = await fetch(`/api/admin/articles/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ liveUpdates: current.map((u) => JSON.stringify(u)) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.message || 'Move failed');
      setArticle((prev) => ({ ...prev, liveUpdates: current } as Article));
    } catch (e) {
      console.error(e);
    }
  };

  const handleEndCoverage = async () => {
    if (!window.confirm('End live coverage? This will convert it to a regular article.')) return;
    const id = String(article.$id ?? article.id ?? '');
    try {
      const res = await fetch('/api/admin/articles/live', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleId: id, isLive: false }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.message || 'Failed');
      window.location.href = '/admin/live';
    } catch (e: any) {
      alert(e.message || 'Failed');
    }
  };

  const handleWrapUp = () => {
    if (!window.confirm('Create a wrap-up summary article from this live blog?')) return;
    window.location.href = '/admin/articles/new';
  };

  const filteredUpdates = liveUpdates.filter((u) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (u.title || '').toLowerCase().includes(q) || (u.content || '').toLowerCase().includes(q) || (u.author || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white md:bg-gray-50 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 pb-4 border-b border-gray-200 gap-4">
        <div className="flex items-center gap-4">
          <a href="/admin/live" className="p-2 hover:bg-gray-100 rounded-full text-gray-500 shrink-0">
            <FaArrowLeft className="w-5 h-5" />
          </a>
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {article.isLive ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse shrink-0"></span>
                  <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Live Now</span>
                </>
              ) : (
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ended</span>
              )}
            </div>
            <h2 className="text-lg md:text-xl font-black text-[#0f3036] line-clamp-1 leading-tight uppercase tracking-tight">{article.headline}</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setShowSettings(true)} className="px-3 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 text-xs transition-all uppercase tracking-wider flex items-center gap-2" type="button">
            <FaGear /> Settings
          </button>
          {article.isLive && (
            <>
              <button onClick={handleWrapUp} className="px-3 py-2 bg-blue-50 text-blue-700 font-bold rounded-lg hover:bg-blue-100 text-xs transition-all uppercase tracking-wider flex items-center gap-2" type="button">
                <FaBookOpen /> Wrap-up
              </button>
              <button onClick={handleEndCoverage} className="px-3 py-2 bg-white border border-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-50 text-xs transition-all uppercase tracking-wider" type="button">
                End Live
              </button>
            </>
          )}
          <a href={`/article/${encodeURIComponent(String(article.$id ?? article.id ?? ''))}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-[#0f3036] text-white font-bold rounded-lg hover:bg-[#1a4a52] text-xs transition-all uppercase tracking-wider text-center">
            View Site
          </a>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-[#0f3036] uppercase tracking-widest">Live Configuration</h3>
              <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-red-500" type="button"><FaXmark className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">Live Video URL (YouTube)</label>
                <input type="text" value={settingsData.videoUrl} onChange={(e) => setSettingsData({ ...settingsData, videoUrl: e.target.value })} placeholder="https://youtube.com/..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#c59d5f] outline-none" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest block">Key Figures</label>
                <textarea value={settingsData.keyFigures} onChange={(e) => setSettingsData({ ...settingsData, keyFigures: e.target.value })} placeholder="Name - Role (One per line)" rows={5} className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#c59d5f] outline-none leading-relaxed" />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowSettings(false)} className="px-6 py-2 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-200 rounded-lg" type="button">Cancel</button>
              <button onClick={handleSaveSettings} className="px-6 py-2 bg-[#0f3036] text-white font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-[#1a4a52]" type="button">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Image Cropper Modal */}
      {showCropper && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex flex-col items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col h-[80vh]">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-[#0f3036] uppercase tracking-widest">Crop Image</h3>
              <button onClick={() => setShowCropper(false)} className="text-gray-400 hover:text-red-500" type="button"><FaXmark className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden">
              {croppingImage && <img src={croppingImage} alt="Crop preview" className="max-w-full max-h-full object-contain" style={{ transform: `scale(${zoom})` }} />}
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex flex-col gap-4 shrink-0">
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-gray-500 uppercase">Zoom</span>
                <input type="range" value={zoom} min={1} max={3} step={0.1} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-full accent-[#0f3036]" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowCropper(false)} className="px-6 py-2 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-200 rounded-lg" type="button">Cancel</button>
                <button onClick={handleCropConfirm} disabled={uploading} className="px-6 py-2 bg-[#0f3036] text-white font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-[#1a4a52] flex items-center gap-2" type="button">
                  {uploading ? <FaSpinner className="animate-spin" /> : <FaCheck />} Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingUpdate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg text-[#0f3036]">Edit Update</h3>
              <button onClick={() => setEditingUpdate(null)} className="text-gray-400 hover:text-red-500" type="button"><FaXmark className="w-5 h-5" /></button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Update title..." className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#c59d5f]" />
              <textarea value={editText} onChange={e => setEditText(e.target.value)} placeholder="Start reporting..." rows={6} className="w-full p-3 bg-white border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#c59d5f] min-h-[140px]" />
              {editImages.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {editImages.map((img, i) => (
                    <div key={i} className="relative group">
                      <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg border" />
                      <button onClick={() => setEditImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity" type="button"><FaXmark className="w-2.5 h-2.5" /></button>
                    </div>
                  ))}
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg text-xs font-bold cursor-pointer hover:bg-gray-200">
                <FaImage /> Add Image
                <input ref={editFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'edit')} />
              </label>
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 shrink-0">
              <button onClick={() => setEditingUpdate(null)} className="px-4 py-2 text-gray-500 font-bold text-xs uppercase tracking-widest hover:bg-gray-200 rounded-lg" type="button">Cancel</button>
              <button onClick={handleSaveEdit} className="px-6 py-2 bg-[#0f3036] text-white font-bold text-xs uppercase tracking-widest rounded-lg hover:bg-[#1a4a52]" type="button">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Tab Switcher */}
      <div className="flex lg:hidden bg-gray-100 p-1 rounded-xl mb-4 shrink-0">
        <button onClick={() => setActiveTab('editor')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'editor' ? 'bg-white text-[#0f3036] shadow-sm' : 'text-gray-500'}`} type="button">Writer</button>
        <button onClick={() => setActiveTab('feed')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'feed' ? 'bg-white text-[#0f3036] shadow-sm' : 'text-gray-500'}`} type="button">Feed ({liveUpdates.length || 0})</button>
      </div>

      <div className="flex gap-6 flex-1 overflow-hidden">
        {/* Editor Column */}
        <div className={`flex-1 lg:w-2/3 flex flex-col gap-4 min-h-0 ${activeTab === 'editor' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 md:p-6 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="shrink-0">
              <input type="text" className="w-full text-lg md:text-xl font-black placeholder:text-gray-200 border-none outline-none mb-2 text-[#0f3036] uppercase tracking-tighter" placeholder="UPDATE TITLE..." value={updateTitle} onChange={(e) => setUpdateTitle(e.target.value)} />
            </div>

            <div className="flex items-center gap-2 mb-4 py-2 border-y border-gray-50 shrink-0 overflow-x-auto no-scrollbar">
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className={`p-2 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors flex items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`} type="button">
                {uploading ? <FaSpinner className="w-4 h-4 animate-spin" /> : <FaImage className="w-4 h-4" />}
                <span className="text-[10px] font-bold uppercase hidden sm:inline">Add Media</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'update')} />
            </div>

            {images.length > 0 && (
              <div className="flex gap-2 flex-wrap mb-4">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} alt="" className="w-20 h-20 object-cover rounded-lg border" />
                    <button onClick={() => setImages(prev => prev.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity" type="button"><FaXmark className="w-2.5 h-2.5" /></button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
              <textarea value={updateText} onChange={(e) => setUpdateText(e.target.value)} placeholder="Start reporting..." className="flex-1 min-h-[180px] w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#c59d5f] text-sm leading-relaxed resize-none" />
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-center pt-4 border-t border-gray-100 mt-4 gap-4 shrink-0">
              <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className={`w-8 h-5 rounded-full transition-colors relative ${isPinned ? 'bg-[#0f3036]' : 'bg-gray-200'}`}>
                    <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${isPinned ? 'left-4' : 'left-0.5'}`} />
                  </div>
                  <input type="checkbox" checked={isPinned} onChange={(e) => setIsPinned(e.target.checked)} className="hidden" />
                  <span className={`text-[10px] font-black uppercase ${isPinned ? 'text-[#0f3036]' : 'text-gray-400'}`}>Pin</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className={`w-8 h-5 rounded-full transition-colors relative ${isKeyEvent ? 'bg-[#c59d5f]' : 'bg-gray-200'}`}>
                    <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${isKeyEvent ? 'left-4' : 'left-0.5'}`} />
                  </div>
                  <input type="checkbox" checked={isKeyEvent} onChange={(e) => setIsKeyEvent(e.target.checked)} className="hidden" />
                  <span className={`text-[10px] font-black uppercase ${isKeyEvent ? 'text-[#c59d5f]' : 'text-gray-400'}`}>Key Event</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <div className={`w-8 h-5 rounded-full transition-colors relative ${isSummary ? 'bg-blue-600' : 'bg-gray-200'}`}>
                    <div className={`absolute top-0.5 w-3.5 h-3.5 bg-white rounded-full transition-all ${isSummary ? 'left-4' : 'left-0.5'}`} />
                  </div>
                  <input type="checkbox" checked={isSummary} onChange={(e) => setIsSummary(e.target.checked)} className="hidden" />
                  <span className={`text-[10px] font-black uppercase ${isSummary ? 'text-blue-600' : 'text-gray-400'}`}>Summary</span>
                </label>
              </div>
              <button onClick={handlePost} disabled={!updateText.trim()} className="w-full sm:w-auto bg-[#c70000] text-white px-8 py-3 rounded-full font-black text-sm uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-[#a10000] transition-all shadow-lg shadow-red-100 disabled:opacity-50 disabled:shadow-none" type="button">
                <FaPaperPlane className="w-4 h-4" /> Post
              </button>
            </div>
          </div>
        </div>

        {/* Feed Column */}
        <div className={`flex-1 lg:w-1/3 bg-white lg:bg-gray-50 border border-gray-200 lg:rounded-2xl flex flex-col min-h-0 overflow-hidden ${activeTab === 'feed' ? 'flex' : 'hidden lg:flex'}`}>
          <div className="p-4 bg-gray-50 border-b border-gray-200 shrink-0 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-black text-[10px] text-gray-400 uppercase tracking-[0.2em]">Live Feed Console</span>
              <span className="text-[10px] font-black text-[#0f3036] bg-[#c59d5f]/20 px-2 py-0.5 rounded-full">{liveUpdates.length || 0} UPDATES</span>
            </div>
            <div className="relative">
              <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-3 h-3" />
              <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search updates..." className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#c59d5f]" />
            </div>
          </div>

          <div ref={feedRef} className="flex-1 overflow-y-auto divide-y divide-gray-100">
            {filteredUpdates.map((update, idx) => (
              <div key={String(update.id)} className={`p-4 hover:bg-gray-50 transition-all group relative ${update.isKeyEvent ? 'border-l-4 border-[#c59d5f] bg-orange-50/30' : 'bg-white lg:bg-transparent'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-black text-xs tabular-nums">{update.time}</span>
                    <div className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">{update.author}</span>
                    {update.isSummary && <span className="text-[10px] bg-blue-100 text-blue-800 px-1 rounded font-bold">SUMMARY</span>}
                    {(update.isPinned || update.pinned) && <FaThumbtack className="w-2.5 h-2.5 text-[#0f3036] rotate-45" />}
                    {update.isKeyEvent && <FaStar className="w-2.5 h-2.5 text-[#c59d5f]" />}
                  </div>
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleMoveUpdate(update.id, 'up')} disabled={idx === 0} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30" type="button"><FaChevronUp className="w-2.5 h-2.5" /></button>
                    <button onClick={() => handleMoveUpdate(update.id, 'down')} disabled={idx === filteredUpdates.length - 1} className="p-1 text-gray-300 hover:text-gray-600 disabled:opacity-30" type="button"><FaChevronDown className="w-2.5 h-2.5" /></button>
                    <button onClick={() => handleStartEdit(update)} className="p-1 text-blue-500 hover:text-blue-700" type="button"><FaPencil className="w-2.5 h-2.5" /></button>
                    <button onClick={() => handleDelete(update.id)} className="p-1 text-red-400 hover:text-red-600" type="button"><FaTrash className="w-2.5 h-2.5" /></button>
                  </div>
                </div>
                {update.title && <h4 className="font-serif font-black text-[#0f3036] mb-1 leading-tight uppercase tracking-tight text-sm">{update.title}</h4>}
                <div className="text-gray-700 text-sm leading-relaxed prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: update.content || '' }} />
                {update.images && update.images.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {update.images.map((img, i) => (
                      <img key={i} src={img} alt="" className="w-16 h-16 object-cover rounded border" />
                    ))}
                  </div>
                )}
                {update.image && (!update.images || update.images.length === 0) && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    <img src={update.image} alt="" className="w-16 h-16 object-cover rounded border" />
                  </div>
                )}
              </div>
            ))}

            {filteredUpdates.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full p-12 text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <FaMagnifyingGlass className="text-gray-300 w-5 h-5" />
                </div>
                <p className="text-gray-400 font-medium text-sm">{searchQuery ? 'No updates match your search' : 'No updates posted yet.'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
