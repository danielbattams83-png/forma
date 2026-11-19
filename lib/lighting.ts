export const ENVIRONMENTS = {
  studio: {
    label: "Studio",
    file: "https://htagr3mh3puvqdzy.public.blob.vercel-storage.com/hdri/studio.hdr",
    // Held under 1 so card previews and the default viewer keep metal and pale surfaces from blowing out.
    intensity: 0.4,
    exposure: 0.55,
    background: "#101010",
  },
  outdoor: {
    label: "Outdoor",
    file: "https://htagr3mh3puvqdzy.public.blob.vercel-storage.com/hdri/outdoor.hdr",
    intensity: 1,
    exposure: 1.02,
    background: "#171512",
  },
  dark: {
    label: "Dark",
    file: "https://htagr3mh3puvqdzy.public.blob.vercel-storage.com/hdri/warehouse.hdr",
    intensity: 0.34,
    exposure: 0.86,
    background: "#090909",
  },
} as const;

export type EnvironmentName = keyof typeof ENVIRONMENTS;

export const ENVIRONMENT_NAMES = Object.keys(ENVIRONMENTS) as EnvironmentName[];
