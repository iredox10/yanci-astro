declare module 'rss-parser' {
  export interface Item {
    title?: string;
    link?: string;
    pubDate?: string;
    isoDate?: string;
    author?: string;
    content?: string;
    summary?: string;
  }

  export interface Output<T = unknown> {
    title?: string;
    link?: string;
    items: (Item & T)[];
    [key: string]: unknown;
  }

  export default class Parser<T = unknown> {
    constructor(options?: Record<string, unknown>);
    parseString(xml: string): Promise<Output<T>>;
    parseURL(url: string): Promise<Output<T>>;
  }
}