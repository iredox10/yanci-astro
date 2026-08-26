export interface InsertCommand {
  id: string;
  label: string;
  hint: string;
  /** HTML snippet inserted at the caret; '|' marks where the caret lands. */
  template: string;
}

export const INSERT_COMMANDS: InsertCommand[] = [
  { id: 'heading', label: 'Heading', hint: '<h2>', template: '\n<h2>|</h2>\n' },
  { id: 'quote', label: 'Quote', hint: '<blockquote>', template: '\n<blockquote>|</blockquote>\n' },
  {
    id: 'list',
    label: 'Jerin abubuwa',
    hint: '<ul>',
    template: '\n<ul>\n  <li>|</li>\n</ul>\n',
  },
  {
    id: 'image',
    label: 'Image link',
    hint: '<a><img>',
    template:
      '\n<figure>\n  <a href="https://">\n    <img src="https://" alt="|" />\n  </a>\n</figure>\n',
  },
];

/** Text right before the caret opens the menu; returns null when it shouldn't. */
export function slashQueryBefore(value: string, caret: number): string | null {
  const match = /(?:^|[\s>])\/([^\s<>]{0,15})$/.exec(value.slice(0, caret));
  return match ? match[1] : null;
}

export function filterCommands(query: string): InsertCommand[] {
  const q = query.trim().toLowerCase();
  if (!q) return INSERT_COMMANDS;
  return INSERT_COMMANDS.filter((c) => c.label.toLowerCase().includes(q) || c.id.includes(q));
}

export function applyInsert(
  value: string,
  caret: number,
  queryLength: number,
  cmd: InsertCommand,
): { value: string; caret: number } {
  const start = Math.max(0, caret - queryLength - 1);
  const before = value.slice(0, start);
  const after = value.slice(caret);
  const markerIndex = cmd.template.indexOf('|');
  const text =
    markerIndex >= 0
      ? cmd.template.slice(0, markerIndex) + cmd.template.slice(markerIndex + 1)
      : cmd.template;
  return {
    value: `${before}${text}${after}`,
    caret: start + (markerIndex >= 0 ? markerIndex : text.length),
  };
}

interface Props {
  commands: InsertCommand[];
  selected: number;
  top: number;
  onHover: (index: number) => void;
  onPick: (cmd: InsertCommand) => void;
}

export default function InsertMenu({ commands, selected, top, onHover, onPick }: Props) {
  return (
    <div
      role="listbox"
      aria-label="Shiga rubutu"
      className="absolute left-3 z-20 w-64 border border-yanci-primary/20 bg-white shadow-xl"
      style={{ top }}
    >
      <p className="border-b border-yanci-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-yanci-primary/50">
        Shiga rubutu
      </p>
      {commands.map((c, i) => (
        <button
          key={c.id}
          type="button"
          role="option"
          aria-selected={i === selected}
          onMouseDown={(e) => {
            e.preventDefault();
            onPick(c);
          }}
          onMouseEnter={() => onHover(i)}
          className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
            i === selected ? 'bg-yanci-primary text-yanci-paper' : 'text-yanci-dark hover:bg-yanci-primary/5'
          }`}
        >
          <span className="font-semibold">{c.label}</span>
          <span className={`font-mono text-[10px] ${i === selected ? 'text-yanci-paper/70' : 'text-yanci-primary/40'}`}>
            {c.hint}
          </span>
        </button>
      ))}
    </div>
  );
}
