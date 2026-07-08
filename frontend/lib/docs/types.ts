export type DocStatus = 'live' | 'partial' | 'planned';

export type DocBlockType = 'paragraph' | 'bullets' | 'steps' | 'code' | 'callout' | 'subheading';

/**
 * A content block within a doc section. Fields are optional and read per
 * `type` (paragraph/callout/subheading use `text`; bullets/steps use `items`;
 * code uses `code`+`language`; callout uses `tone`). Kept loose rather than a
 * discriminated union so the generated content literal type-checks cleanly.
 */
export interface DocBlock {
  type: DocBlockType;
  text?: string;
  items?: string[];
  language?: string;
  code?: string;
  tone?: 'info' | 'warn';
}

export interface DocSection {
  id: string;
  group: string;
  title: string;
  status: DocStatus;
  lede: string;
  blocks: DocBlock[];
}
