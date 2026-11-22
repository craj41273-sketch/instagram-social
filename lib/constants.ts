export const APP_NAME = "Instagram Social";
export const APP_DESCRIPTION =
  "A premium social media experience built with Next.js, Supabase, and Neon PostgreSQL.";

export const FOUNDATION_LAYERS = [
  {
    title: "Interface",
    description: "App Router pages, reusable components, and shadcn/ui primitives.",
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
