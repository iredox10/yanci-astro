import { useState } from 'react';
import {
  FaImage,
  FaTrash,
  FaCloudArrowUp,
  FaCopy,
  FaCheck,
  FaSpinner,
  FaMagnifyingGlass,
} from 'react-icons/fa6';

export interface MediaFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  createdAt: string;
  url: string;
}

interface Props {
  initialFiles: MediaFile[];
}

export default function MediaManager({ initialFiles }: Props) {
  const [files, setFiles] = useState<MediaFile[]>(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      const res = await fetch('/api/admin/media', { method: 'POST', body: form });
      if (!res.ok) throw new Error('Upload failed');
      const data = (await res.json()) as { fileId: string; url: string };
      setFiles((prev) => [
        {
          id: data.fileId,
          name: file.name,
          size: file.size,
          mimeType: file.type,
          createdAt: new Date().toISOString(),
          url: data.url,
        },
        ...prev,
      ]);
    } catch (error) {
      alert('Upload failed');
      console.error(error);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (fileId: string) => {
    if (window.confirm('Shin kana son share wannan hoton? Ba za a iya dawo da shi ba.')) {
      try {
        const res = await fetch(`/api/admin/media/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
      } catch (error) {
        alert('Failed to delete file. It might be in use.');
        console.error(error);
      }
    }
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredFiles = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-800">Media Library</h2>
          <p className="text-sm text-gray-500">Gudanar da hotuna da fayiloli</p>
        </div>

        <label className="bg-[#0f3036] text-white px-4 py-2.5 rounded-md flex items-center justify-center gap-2 hover:bg-[#1a454c] transition-colors font-bold text-sm cursor-pointer w-full sm:w-auto">
          {uploading ? <FaSpinner className="animate-spin w-4 h-4" /> : <FaCloudArrowUp className="w-4 h-4" />}
          Loda Hoto
          <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      </div>

      <div className="relative max-w-md">
        <FaMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Nemo hoto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#c59d5f]"
        />
      </div>

      {filteredFiles.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
          <FaImage className="mx-auto text-4xl text-gray-300 mb-2" />
          <p className="text-gray-500">Babu hotuna a dakin ajiya.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredFiles.map((file) => (
            <div key={file.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden group">
              <div className="aspect-square relative bg-gray-100 placeholder-image">
                <img src={file.url} alt={file.name} className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button
                    onClick={() => copyUrl(file.url, file.id)}
                    className="p-2 bg-white text-gray-800 rounded-full hover:bg-gray-100"
                    title="Kwafi URL"
                  >
                    {copiedId === file.id ? <FaCheck className="text-green-600" /> : <FaCopy />}
                  </button>
                  <button
                    onClick={() => handleDelete(file.id)}
                    className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50"
                    title="Share"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
              <div className="p-3">
                <p className="text-xs font-bold text-gray-800 truncate" title={file.name}>
                  {file.name}
                </p>
                <div className="flex justify-between items-center mt-1 text-[10px] text-gray-500">
                  <span>{(file.size / 1024 / 1024).toFixed(2) + ' MB'}</span>
                  <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
