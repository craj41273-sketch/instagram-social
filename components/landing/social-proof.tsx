import { PageContainer } from "@/components/layout/page-container";
import { UserPreview } from "@/components/shared/user-preview";
import { StatusBadge } from "@/components/ui/status-badge";
import { sampleAvatars } from "@/lib/media";

const samplePeople = [
  { name: "Maya Chen", handle: "@maya · sample", avatar: sampleAvatars.maya },
  { name: "Avery Stone", handle: "@avery · sample", avatar: sampleAvatars.avery },
  { name: "Noor Rahman", handle: "@noor · sample", avatar: sampleAvatars.noor },
] as const;

/**
 * Honest social proof: a clearly labelled illustration of the kind of people
 * the product is for. No real members, counts, or testimonials are claimed.
 */
export function SocialProof() {
  return (
    <section aria-labelledby="community-heading" className="py-14 sm:py-20">
      <PageContainer className="max-w-6xl">
        <div className="rounded-3xl border border-border/60 bg-surface/50 p-6 sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <StatusBadge tone="neutral">Illustrative only</StatusBadge>
              <h2
                id="community-heading"
                className="mt-4 font-heading text-headline"
              >
                Made for people who notice things.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              These are sample profiles used to show the intended experience.
              Luma has no members yet.
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {samplePeople.map((person) => (
              <div
                key={person.handle}
                className="rounded-2xl border border-border/60 bg-card/70 p-4"
              >
                <UserPreview
                  name={person.name}
                  handle={person.handle}
                  avatarSrc={person.avatar}
                  size="sm"
                />
                <p className="mt-3 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  Sample profile · no account exists
                </p>
              </div>
            ))}
          </div>
        </div>
      </PageContainer>
    </section>
  );
}
