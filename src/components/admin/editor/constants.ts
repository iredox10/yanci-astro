import {
  FaGear,
  FaCalendarCheck,
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
} from 'react-icons/fa6';

export const PILLAR_SECTIONS: Record<string, string[]> = {
  news: ['headlines', 'siyasa', 'kasa', 'duniya', 'tattalin-arziki'],
  sport: ['wasanni', 'kwallon-kafa', 'dambe', 'tsere', 'wasan-kwaikwayo'],
  opinion: ["ra'ayi", 'sharhi', 'edito', 'tattaunawa'],
  culture: ["al'adu", 'fasaha', 'kiɗa', 'fim', 'littafi'],
  lifestyle: ['kasuwanci', 'lafiya', 'abinci', 'tafiye-tafiye', 'fasaha-rayuwa'],
};

export const ARTICLE_FORMATS = [
  { value: 'news', label: 'Labarai' },
  { value: 'feature', label: 'Feature' },
  { value: 'opinion', label: "Ra'ayi" },
  { value: 'analysis', label: 'Nazari' },
  { value: 'interview', label: 'Hira' },
  { value: 'explainer', label: 'Bayani' },
  { value: 'review', label: 'Duba' },
  { value: 'breaking', label: 'Labari mai karfi' },
];

export const FORMAT_COLOR: Record<string, string> = {
  news: 'bg-red-50 text-red-700 border-red-100',
  feature: 'bg-purple-50 text-purple-700 border-purple-100',
  opinion: 'bg-orange-50 text-orange-700 border-orange-100',
  analysis: 'bg-blue-50 text-blue-700 border-blue-100',
  interview: 'bg-teal-50 text-teal-700 border-teal-100',
  explainer: 'bg-indigo-50 text-indigo-700 border-indigo-100',
  review: 'bg-pink-50 text-pink-700 border-pink-100',
  breaking: 'bg-red-100 text-red-800 border-red-200',
};

export const STATUS_META: Record<string, { label: string; color: string; dot: string }> = {
  published: { label: 'Published', color: 'bg-green-50 text-green-700 border-green-100', dot: 'bg-green-500' },
  draft: { label: 'Draft', color: 'bg-gray-100 text-gray-600 border-gray-200', dot: 'bg-gray-400' },
  scheduled: { label: 'Scheduled', color: 'bg-blue-50 text-blue-700 border-blue-100', dot: 'bg-blue-500' },
  review: { label: 'In Review', color: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' },
};

export const PANELS = [
  { id: 'publish', label: 'Publish', icon: FaCalendarCheck },
  { id: 'meta', label: 'Metadata', icon: FaGear },
  { id: 'media', label: 'Media', icon: FaImage },
  { id: 'seo', label: 'SEO', icon: FaMagnifyingGlass },
  { id: 'social', label: 'Social', icon: FaShareNodes },
  { id: 'links', label: 'Links', icon: FaLink },
  { id: 'related', label: 'Related', icon: FaNewspaper },
  { id: 'pullquotes', label: 'Quotes', icon: FaQuoteLeft },
  { id: 'notes', label: 'Notes', icon: FaCircleInfo },
  { id: 'tools', label: 'AI Tools', icon: FaWandMagicSparkles },
  { id: 'corrections', label: 'Corrections', icon: FaTriangleExclamation },
];

export const PANELS_WITH_HISTORY = [
  ...PANELS,
  { id: 'history', label: 'History', icon: FaClockRotateLeft },
];

export const SLASH_COMMANDS = [
  { id: 'h2', label: 'Heading 2', icon: 'H2', desc: 'Large section heading', action: 'format', format: { header: 2 } },
  { id: 'h3', label: 'Heading 3', icon: 'H3', desc: 'Sub-section heading', action: 'format', format: { header: 3 } },
  { id: 'quote', label: 'Quote', icon: '❝', desc: 'Pull quote block', action: 'format', format: { blockquote: true } },
  { id: 'body-image', label: 'Insert Image', icon: 'IMG', desc: 'Upload or paste image', action: 'component', type: 'body-image' },
  { id: 'table', label: 'Table', icon: 'TBL', desc: 'Data table', action: 'component', type: 'table' },
  { id: 'youtube', label: 'YouTube', icon: 'YT', desc: 'Embed video', action: 'component', type: 'youtube' },
  { id: 'twitter', label: 'Tweet / X', icon: 'X', desc: 'Embed tweet', action: 'component', type: 'twitter' },
  { id: 'map', label: 'Map', icon: 'MAP', desc: 'Google Maps embed', action: 'component', type: 'map' },
  { id: 'highlight', label: 'Highlight Box', icon: '!', desc: 'Important callout', action: 'component', type: 'highlight' },
  { id: 'internal-link', label: 'Internal Link', icon: 'LINK', desc: 'Link to article', action: 'component', type: 'internal-link' },
];
