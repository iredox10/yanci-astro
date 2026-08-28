import { FaCheck, FaXmark, FaFileCirclePlus } from 'react-icons/fa6';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  formData: Record<string, any>;
}

const PublishConfirmModal = ({ open, onClose, onConfirm, formData }: Props) => {
  if (!open) return null;

  const checklist = [
    { ok: !!formData.headline, label: 'Headline is set' },
    { ok: !!formData.trail, label: 'Summary is set' },
    { ok: !!formData.image, label: 'Featured image is set' },
    { ok: !!formData.tags, label: 'Tags are added' },
    { ok: (formData.metaTitle || formData.headline || '').length <= 60, label: 'Meta title ≤ 60 chars' },
    { ok: (formData.metaDescription || formData.trail || '').length <= 160, label: 'Meta description ≤ 160 chars' },
  ];

  const allGood = checklist.every((i) => i.ok);

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <FaFileCirclePlus className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">Publish Article</h3>
            <p className="text-xs text-gray-500">This article will be visible to readers</p>
          </div>
        </div>

        <div className="space-y-2 mb-6 p-4 bg-gray-50 rounded-xl">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pre-publish checklist</p>
          {checklist.map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              {item.ok ? <FaCheck className="w-3 h-3 text-green-500" /> : <FaXmark className="w-3 h-3 text-red-400" />}
              <span className={item.ok ? 'text-gray-700' : 'text-gray-400'}>{item.label}</span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50" type="button">
            Review
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-lg transition-colors ${allGood ? 'bg-[#052962] hover:bg-[#052962]/90' : 'bg-[#052962]/70 hover:bg-[#052962]/80'}`}
            type="button"
          >
            Publish Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default PublishConfirmModal;
