export const SPANS = ["1x1", "2x1", "2x2"] as const;

export type Span = (typeof SPANS)[number];

export type ModelRecord = {
  id: string;
  title: string;
  description: string;
  category: string;
  span: Span;
  src: string;
  thumbnail: string;
  polycount: number | null;
  notes: string;
  createdAt: string;
  order: number;
};

export type ModelInput = {
  title: string;
  description: string;
  category: string;
  span: Span;
  src: string;
  thumbnail: string;
  polycount: number | null;
  notes: string;
};

export type ModelPatch = Partial<
  Pick<ModelRecord, "title" | "description" | "category" | "span" | "notes">
>;

export function isSpan(value: unknown): value is Span {
  return value === "1x1" || value === "2x1" || value === "2x2";
}

export function formatCount(value: number | null | undefined) {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US").format(value);
}
