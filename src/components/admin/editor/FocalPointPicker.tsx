import { useRef } from 'react';

interface Props {
  imageUrl: string;
  focalX: number | null | undefined;
  focalY: number | null | undefined;
  onChange: (x: number, y: number) => void;
}

const FocalPointPicker = ({ imageUrl, focalX, focalY, onChange }: Props) => {
  const ref = useRef<HTMLDivElement | null>(null);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);
    onChange(x, y);
  };

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Focal Point</p>
      <div
        ref={ref}
        onClick={handleClick}
        className="relative w-full aspect-video rounded-lg overflow-hidden cursor-crosshair border border-gray-200 bg-gray-100"
        style={{
          backgroundImage: `url(${imageUrl})`,
          backgroundSize: 'cover',
          backgroundPosition: `${focalX ?? 50}% ${focalY ?? 50}%`,
        }}
      >
        {focalX != null && focalY != null && (
          <div
            className="absolute w-5 h-5 rounded-full border-2 border-white shadow-md bg-[#c70000]/70 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
            style={{ left: `${focalX}%`, top: `${focalY}%` }}
          />
        )}
        <div className="absolute bottom-2 right-2 text-[10px] text-white font-mono bg-black/50 px-1.5 py-0.5 rounded">
          {focalX ?? 50}%, {focalY ?? 50}%
        </div>
      </div>
      <p className="text-[10px] text-gray-400">Click the image to set the focal point for cropping.</p>
    </div>
  );
};

export default FocalPointPicker;
