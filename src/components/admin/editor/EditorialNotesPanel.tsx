import { useState } from 'react';
import { FaXmark, FaCheck } from 'react-icons/fa6';

interface Note {
  id: string;
  text: string;
  author?: string;
  createdAt?: string;
  resolved?: boolean;
}

interface Props {
  notes: Note[];
  onAdd: (text: string) => void;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
  currentAuthor?: string;
}

const EditorialNotesPanel = ({ notes, onAdd, onResolve, onDelete }: Props) => {
  const [newNote, setNewNote] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newNote.trim()) {
      onAdd(newNote);
      setNewNote('');
    }
  };

  const unresolved = notes.filter((n) => !n.resolved);
  const resolved = notes.filter((n) => n.resolved);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Add an editorial note..."
          rows={2}
          className="w-full text-sm p-3 border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-[#052962]/20 focus:border-[#052962] resize-none"
        />
        <button
          type="submit"
          disabled={!newNote.trim()}
          className="w-full py-2 bg-[#052962] text-white text-xs font-bold rounded-lg hover:bg-[#052962]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Add Note
        </button>
      </form>

      {unresolved.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Active ({unresolved.length})</p>
          {unresolved.map((note) => (
            <div key={note.id} className="p-3 bg-amber-50 border border-amber-100 rounded-lg group">
              <p className="text-xs text-gray-700 leading-relaxed">{note.text}</p>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] text-gray-400">
                  {note.author} · {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ''}
                </span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onResolve(note.id)} className="text-green-600 hover:text-green-800 text-[10px] font-bold flex items-center gap-1" type="button">
                    <FaCheck className="w-3 h-3" /> Resolve
                  </button>
                  <button onClick={() => onDelete(note.id)} className="text-gray-400 hover:text-red-600" type="button">
                    <FaXmark className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {resolved.length > 0 && (
        <details className="space-y-2">
          <summary className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider cursor-pointer">Resolved ({resolved.length})</summary>
          <div className="space-y-2 mt-2">
            {resolved.map((note) => (
              <div key={note.id} className="p-3 bg-gray-50 border border-gray-100 rounded-lg opacity-60">
                <p className="text-xs text-gray-500 line-through">{note.text}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-gray-300">
                    {note.author} · {note.createdAt ? new Date(note.createdAt).toLocaleDateString() : ''}
                  </span>
                  <button onClick={() => onDelete(note.id)} className="text-gray-300 hover:text-red-500" type="button">
                    <FaXmark className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {notes.length === 0 && <p className="text-center text-xs text-gray-400 py-6">No editorial notes yet.</p>}
    </div>
  );
};

export default EditorialNotesPanel;
