"use client";

import type { ReactNode } from "react";
import { Bell, EyeOff, ImageIcon, Search, Sparkles } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { FormField } from "@/components/shared/form-field";
import { ImageContainer } from "@/components/shared/image-container";
import { SensitiveSurface } from "@/components/shared/sensitive-surface";
import {
  SkeletonCard,
  SkeletonLine,
  SkeletonUserPreview,
} from "@/components/shared/skeletons";
import { UserPreview } from "@/components/shared/user-preview";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";
import { PremiumButton } from "@/components/ui/premium-button";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-heading text-title">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

const colorTokens = [
  { name: "Background", token: "background", className: "bg-background", foreground: "text-foreground" },
  { name: "Surface", token: "surface", className: "bg-surface", foreground: "text-foreground" },
  { name: "Card", token: "card", className: "bg-card", foreground: "text-card-foreground" },
  { name: "Primary", token: "primary", className: "bg-primary", foreground: "text-primary-foreground" },
  { name: "Success", token: "success", className: "bg-success", foreground: "text-success-foreground" },
  { name: "Warning", token: "warning", className: "bg-warning", foreground: "text-warning-foreground" },
  { name: "Destructive", token: "destructive", className: "bg-destructive", foreground: "text-white" },
  { name: "Muted", token: "muted", className: "bg-muted", foreground: "text-foreground" },
] as const;

export default function DesignSystemPage() {
  const { toast } = useToast();

  return (
    <PageContainer className="py-12 sm:py-16">
      <header className="max-w-2xl">
        <StatusBadge tone="brand">Living system</StatusBadge>
        <h1 className="mt-5 font-heading text-headline sm:text-display">
          Design system
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
          Tokens, primitives, and patterns for Luma. Every control here is a
          reusable component; no product or social features are present.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          <span className="sm:hidden">Mobile layout</span>
          <span className="hidden sm:inline md:hidden">Tablet layout</span>
          <span className="hidden md:inline xl:hidden">Desktop layout</span>
          <span className="hidden xl:inline 3xl:hidden">Wide layout</span>
          <span className="hidden 3xl:inline">Ultra-wide layout</span>
        </p>
      </header>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <Section
          title="Color tokens"
          description="Dark-first palette with accessible semantic accents."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {colorTokens.map((color) => (
              <div key={color.token} className="space-y-2">
                <div
                  className={`flex h-16 items-end rounded-xl border border-border/60 p-2 ${color.className} ${color.foreground}`}
                >
                  <span className="text-[10px] font-medium opacity-90">
                    {color.token}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{color.name}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title="Typography"
          description="Geist for interface text, Instrument Serif for display."
        >
          <div className="space-y-4">
            <p className="font-heading text-headline">Quiet, luminous type</p>
            <p className="font-heading text-title">Section and card headings</p>
            <p className="text-sm text-muted-foreground">
              Body copy uses a comfortable measure and muted secondary text.
            </p>
            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
              Overline / label
            </p>
          </div>
        </Section>

        <Section
          title="Buttons &amp; feedback"
          description="Premium variants layered on shadcn/ui with restrained motion."
        >
          <div className="flex flex-wrap items-center gap-3">
            <PremiumButton>Primary</PremiumButton>
            <PremiumButton premiumVariant="soft">Soft</PremiumButton>
            <PremiumButton premiumVariant="outline">Outline</PremiumButton>
            <PremiumButton premiumVariant="ghost">Ghost</PremiumButton>
            <PremiumButton premiumVariant="danger">Danger</PremiumButton>
            <IconButton label="Notifications">
              <Bell className="size-4" aria-hidden="true" />
            </IconButton>
            <Spinner label="Loading example" />
          </div>
        </Section>

        <Section
          title="Inputs"
          description="Semantic fields with labels, hints, and validation states."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="ds-email"
              label="Email"
              hint="We never share your address."
            >
              <Input
                id="ds-email"
                type="email"
                placeholder="you@example.com"
                aria-describedby="ds-email-hint"
              />
            </FormField>
            <FormField
              id="ds-handle"
              label="Username"
              error="This handle is already in use."
            >
              <Input
                id="ds-handle"
                defaultValue="luma"
                aria-invalid
                aria-describedby="ds-handle-error"
              />
            </FormField>
            <FormField
              id="ds-bio"
              label="Bio"
              hint="A few words about you."
              className="sm:col-span-2"
            >
              <Textarea
                id="ds-bio"
                rows={3}
                placeholder="Tell your story…"
                aria-describedby="ds-bio-hint"
              />
            </FormField>
          </div>
        </Section>

        <Section
          title="Badges"
          description="Status tones for metadata and system feedback."
        >
          <div className="flex flex-wrap gap-2">
            <StatusBadge>Neutral</StatusBadge>
            <StatusBadge tone="brand">Brand</StatusBadge>
            <StatusBadge tone="success">Success</StatusBadge>
            <StatusBadge tone="warning">Warning</StatusBadge>
            <StatusBadge tone="danger">Danger</StatusBadge>
          </div>
        </Section>

        <Section
          title="Avatars &amp; user preview"
          description="Identity summaries with initials fallback and presence."
        >
          <div className="space-y-5">
            <UserPreview
              name="Maya Chen"
              handle="@mayac"
              avatarSrc="/prism-art.svg"
              verified
              online
            />
            <UserPreview name="Avery Stone" handle="@averys" size="sm" />
          </div>
        </Section>

        <Section
          title="Dropdown menu"
          description="Keyboard-navigable actions with Radix primitives."
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <PremiumButton premiumVariant="outline">Open menu</PremiumButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                Settings
                <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem>
                Appearance
                <DropdownMenuShortcut>⌘A</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </Section>

        <Section
          title="Dialog &amp; tooltip"
          description="Focus-trapped overlays with gentle enter and exit motion."
        >
          <div className="flex flex-wrap gap-3">
            <Dialog>
              <DialogTrigger asChild>
                <PremiumButton>Open dialog</PremiumButton>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>A considered moment</DialogTitle>
                  <DialogDescription>
                    Dialogs use a softened surface, subtle border, and a dimmed
                    backdrop.
                  </DialogDescription>
                </DialogHeader>
                <ImageContainer
                  alt="Prism artwork"
                  src="/prism-art.svg"
                  ratio="wide"
                />
                <DialogFooter>
                  <DialogClose asChild>
                    <button type="button" className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:text-foreground">
                      Cancel
                    </button>
                  </DialogClose>
                  <DialogClose asChild>
                    <PremiumButton>Confirm</PremiumButton>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="rounded-lg border border-border bg-surface px-4 py-2 text-sm transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring"
                >
                  Hover or focus
                </button>
              </TooltipTrigger>
              <TooltipContent>Helpful context appears here.</TooltipContent>
            </Tooltip>
          </div>
        </Section>

        <Section
          title="Tabs"
          description="Organized views without a page change."
        >
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="pt-4 text-sm text-muted-foreground">
              A calm summary of the things that matter.
            </TabsContent>
            <TabsContent value="activity" className="pt-4 text-sm text-muted-foreground">
              Recent events and updates.
            </TabsContent>
            <TabsContent value="settings" className="pt-4 text-sm text-muted-foreground">
              Preferences for this workspace.
            </TabsContent>
          </Tabs>
        </Section>

        <Section
          title="Toast notifications"
          description="Non-blocking feedback with semantic tones."
        >
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                toast({
                  title: "Changes saved",
                  description: "Your preferences are up to date.",
                  tone: "success",
                })
              }
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-ring"
            >
              Success toast
            </button>
            <button
              type="button"
              onClick={() =>
                toast({
                  title: "Upload failed",
                  description: "Please check your connection and retry.",
                  tone: "error",
                })
              }
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/16 focus-visible:outline-2 focus-visible:outline-ring"
            >
              Error toast
            </button>
          </div>
        </Section>

        <Section
          title="Loading states"
          description="Skeletons and spinners that preserve layout stability."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-3">
              <SkeletonUserPreview />
              <SkeletonLine className="w-2/3" />
              <Spinner label="Loading content" />
            </div>
            <SkeletonCard />
          </div>
        </Section>

        <Section
          title="Media"
          description="Ratio-aware image frames with cover/contain fit, loading, and fallback states."
        >
          <div className="grid gap-4 sm:grid-cols-4">
            <ImageContainer
              alt="Prism artwork square"
              src="/prism-art.svg"
              ratio="square"
            />
            <ImageContainer
              alt="Contained media preview"
              src="/prism-art.svg"
              ratio="square"
              fit="contain"
            />
            <ImageContainer
              alt="Loading preview"
              ratio="portrait"
              loading
            />
            <ImageContainer
              alt="Gradient fallback"
              ratio="wide"
            />
          </div>
        </Section>

        <Section
          title="Sensitive surface"
          description="Discourages casual copy of private content; OS screenshots and recordings remain outside browser control."
        >
          <SensitiveSurface className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <div className="flex items-start gap-3">
              <EyeOff className="mt-0.5 size-4 text-muted-foreground" aria-hidden="true" />
              <p className="text-sm text-muted-foreground">
                Right-click, drag, and text selection are disabled here. This is a
                friction control, not a confidentiality boundary.
              </p>
            </div>
          </SensitiveSurface>
        </Section>

        <Section
          title="Empty &amp; error states"
          description="Clear next steps when content is missing or fails."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <EmptyState
              title="Nothing here yet"
              description="When content arrives, it will appear in this space."
              icon={ImageIcon}
              action={
                <PremiumButton premiumVariant="outline" size="sm">
                  Add content
                </PremiumButton>
              }
            />
            <ErrorState
              title="Could not load"
              description="We could not reach the service. Try once more."
              icon={Sparkles}
              action={
                <PremiumButton premiumVariant="danger" size="sm">
                  Retry
                </PremiumButton>
              }
            />
          </div>
        </Section>

        <Section
          title="Search affordance"
          description="A sample input treatment for future discovery surfaces."
        >
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              aria-label="Search the design system"
              placeholder="Search components…"
              className="pl-9"
            />
          </div>
        </Section>
      </div>
    </PageContainer>
  );
}
