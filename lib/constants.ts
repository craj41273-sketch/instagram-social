export const APP_NAME = "Luma";
export const APP_DESCRIPTION =
  "Luma is a premium, dark-first photo-sharing experience built with Next.js, Supabase, and Neon PostgreSQL.";

export const FOUNDATION_LAYERS = [
  {
    title: "Interface",
    description:
      "App Router pages, reusable components, and a cohesive shadcn/ui-based design system.",
  },
  {
    title: "Application",
    description: "Server actions and orchestration, kept free of storage details.",
  },
  {
    title: "Data access",
    description: "Drizzle ORM over Neon PostgreSQL, accessed through typed clients.",
  },
  {
    title: "Infrastructure",
    description: "Supabase Auth, Storage, Realtime, and validated environment config.",
  },
] as const;

export const DESIGN_PRINCIPLES = [
  {
    title: "Quiet by default",
    description: "Calm surfaces, restrained color, and content-first layouts.",
  },
  {
    title: "Tactile feedback",
    description: "Subtle elevation, focus rings, and motion that confirms intent.",
  },
  {
    title: "Accessible contrast",
    description: "Readable text, semantic controls, and keyboard-friendly primitives.",
  },
  {
    title: "Fluid across screens",
    description: "Mobile-first spacing that scales to wide desktops.",
  },
] as const;
