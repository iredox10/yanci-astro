import { useEffect, useRef, useState } from 'react';

interface Stat {
  label: string;
  value: number;
  suffix: string;
}

const StatCounter = ({ stat }: { stat: Stat }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const done = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !done.current) {
          done.current = true;
          const duration = 2000;
          let start: number | null = null;
          const animate = (t: number) => {
            if (start === null) start = t;
            const progress = Math.min((t - start) / duration, 1);
            setCount(Math.floor(progress * stat.value));
            if (progress < 1) requestAnimationFrame(animate);
          };
          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [stat.value]);

  return (
    <div ref={ref} className="text-center group">
      <div className="text-5xl md:text-6xl font-serif font-black text-white mb-2">
        {count.toLocaleString()}
        {stat.suffix}
      </div>
      <div className="text-sm font-bold uppercase tracking-widest text-[#c59d5f]">{stat.label}</div>
    </div>
  );
};

export default StatCounter;