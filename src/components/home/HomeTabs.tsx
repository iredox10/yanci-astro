import { useState } from 'react';
import type { ArticleCard } from '../../data/schema';

interface Props {
  latest: ArticleCard[];
  popular: ArticleCard[];
}

type Tab = 'latest' | 'popular';

const TabItem = ({ item, index }: { item: ArticleCard; index: number }) => {
  const href = `/article/${item.$id ?? item.id}`;
  return (
    <a href={href} className="group flex gap-4 -mx-4 px-4 py-4 border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50/50 transition-all rounded-lg">
      <span className="text-2xl font-serif font-black text-gray-200 group-hover:text-[#c59d5f] transition-colors w-8 shrink-0">
        {String(index + 1).padStart(2, '0')}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          {item.isLive && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-white bg-red-500 px-2 py-0.5 rounded-full animate-pulse">
              Kai Tsaye
            </span>
          )}
          {item.kicker && (
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8a2c2c]">{item.kicker}</span>
          )}
        </div>
        <h3 className="font-serif text-base font-bold text-[#1c1917] leading-snug group-hover:text-[#0f3036] transition-colors line-clamp-2">
          {item.headline}
        </h3>
        <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400 font-medium">
          <span>{item.author ?? 'Yanci'}</span>
          {item.views != null && <span>· {item.views >= 1000 ? `${(item.views / 1000).toFixed(1)}K` : item.views} kallo</span>}
        </div>
      </div>
      {item.image && (
        <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0">
          <img src={item.image} alt={item.headline} loading="lazy" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
        </div>
      )}
    </a>
  );
};

const HomeTabs = ({ latest, popular }: Props) => {
  const [active, setActive] = useState<Tab>('latest');
  const items = active === 'latest' ? latest : popular;
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
      <div className="flex border-b border-gray-100">
        {([
          ['latest', 'Sabbi'],
          ['popular', 'Fiye da Sauran'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActive(key)}
            aria-pressed={active === key}
            className={`flex-1 py-4 text-xs font-bold uppercase tracking-wider transition-all ${
              active === key
                ? 'text-[#0f3036] border-b-2 border-[#c59d5f] bg-gray-50/50'
                : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="p-4">
        <div className="space-y-0">
          {items.slice(0, 5).map((item, i) => (
            <TabItem key={(item.$id ?? item.id) as string | number} item={item} index={i} />
          ))}
        </div>
      </div>
      <div className="p-4 border-t border-gray-100 bg-gray-50/30 mt-auto">
        <a href="/labarai" className="w-full py-3 text-xs font-bold uppercase tracking-wider text-[#0f3036] hover:text-[#c59d5f] transition-colors flex items-center justify-center gap-2 group">
          Duba labarai duka
          <svg className="w-3 h-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" viewBox="0 0 384 512" fill="currentColor" aria-hidden="true"><path d="M342.6 214.6 235.6 321.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3L274.7 224H32c-17.7 0-32-14.3-32-32s14.3-32 32-32h242.7l-84.4-77.3c-12.5-12.5-12.5-32.8 0-45.3s32.8-12.5 45.3 0l103.1 103.1C355.1 182.2 352 197.8 352 213.7s3.1 31.5-9.4 0.9z"/></svg>
        </a>
      </div>
    </div>
  );
};

export default HomeTabs;