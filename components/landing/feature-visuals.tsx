import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { ImageContainer } from "@/components/shared/image-container";
import { StatusBadge } from "@/components/ui/status-badge";
import { UserPreview } from "@/components/shared/user-preview";
import { Heart, ImageIcon, MessageCircle, Users } from "lucide-react";
import { landingImages, sampleAvatars } from "@/lib/media";

/**
 * Static mock interfaces used as marketing illustrations. They are decorative
 * only: the surrounding page hides them from assistive technology and every
 * label makes clear that the people and content are samples.
 */

export function ShareVisual() {
  return (
    <div className="relative h-[300px] sm:h-[340px]">
      <div className="absolute left-0 top-0 w-[57%]">
        <ImageContainer
          src={landingImages.share}
          alt="Stars above a mountain ridge"
          ratio="portrait"
          unoptimized
          sizes="(max-width: 1024px) 40vw, 260px"
          className="shadow-soft"
        />
      </div>
      <div className="absolute right-0 top-[12%] w-[42%] animate-float-slow">
        <ImageContainer
          src={landingImages.heroTop}
          alt="Bright coastline in daylight"
          ratio="square"
          unoptimized
          sizes="(max-width: 1024px) 30vw, 200px"
          className="shadow-lift"
        />
      </div>
      <div className="absolute bottom-0 left-[8%] w-[82%] rounded-2xl border border-border/70 bg-card/95 p-4 shadow-lift backdrop-blur-xl">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ImageIcon className="size-3.5 text-primary" aria-hidden="true" />
          Just shared · sample moment
        </div>
        <p className="mt-2 font-heading text-title">A view from the ridge</p>
        <div className="mt-3 flex items-center gap-2">
          <StatusBadge tone="brand">Photography</StatusBadge>
          <StatusBadge>Outdoor</StatusBadge>
        </div>
      </div>
    </div>
  );
}

export function DiscoverVisual() {
  const people = [
    { name: "Maya Chen", handle: "@maya · sample", avatar: sampleAvatars.maya },
    { name: "Avery Stone", handle: "@avery · sample", avatar: sampleAvatars.avery },
    { name: "Noor Rahman", handle: "@noor · sample", avatar: sampleAvatars.noor },
  ];

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            For you
          </p>
          <p className="mt-1 font-heading text-title">People to know</p>
        </div>
        <StatusBadge tone="brand">Sample</StatusBadge>
      </div>
      <div className="mt-5 space-y-4">
        {people.map((person) => (
          <div key={person.handle} className="flex items-center gap-2">
            <UserPreview
              name={person.name}
              handle={person.handle}
              avatarSrc={person.avatar}
              size="sm"
            />
            <span className="shrink-0 rounded-lg border border-border px-2.5 py-1 text-xs text-muted-foreground">
              View
            </span>
          </div>
        ))}
      </div>
      <p className="mt-5 border-t border-border/60 pt-4 text-xs text-muted-foreground">
        Illustrative profiles · not real members
      </p>
    </div>
  );
}

export function CommunityVisual() {
  const members = [
    { name: "Maya", src: sampleAvatars.maya },
    { name: "Avery", src: sampleAvatars.avery },
    { name: "Noor", src: sampleAvatars.noor },
    { name: "Leo", src: sampleAvatars.leo },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <ImageContainer
        src={landingImages.community}
        alt="Sunlight falling through a forest"
        ratio="portrait"
        unoptimized
        sizes="(max-width: 640px) 80vw, 220px"
        className="hidden shadow-soft sm:block"
      />
      <div className="flex flex-col justify-center rounded-2xl border border-border/60 bg-card/70 p-5">
        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
          <Users className="size-4" aria-hidden="true" />
        </span>
        <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Sample circle
        </p>
        <p className="mt-1 font-heading text-title">Golden Hour Club</p>
        <div className="mt-5 flex -space-x-2">
          {members.map((member) => (
            <Avatar key={member.name} className="size-9 ring-2 ring-card">
              <AvatarImage src={member.src} alt={member.name} />
              <AvatarFallback>{member.name[0]}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          A place for the light chasers. Illustrative community preview.
        </p>
        <div className="mt-4 flex gap-4 border-t border-border/60 pt-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Heart className="size-3.5" aria-hidden="true" /> Shared
          </span>
          <span className="flex items-center gap-1.5">
            <MessageCircle className="size-3.5" aria-hidden="true" /> Talk
          </span>
        </div>
      </div>
    </div>
  );
}

export function ConnectionVisual() {
  return (
    <div className="space-y-4">
      <div className="flex items-end gap-3">
        <Avatar className="size-9">
          <AvatarImage src={sampleAvatars.leo} alt="Leo" />
          <AvatarFallback>L</AvatarFallback>
        </Avatar>
        <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-3 text-sm text-foreground">
          That light on the water is unreal.
        </div>
      </div>
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary/12 px-4 py-3 text-sm text-foreground">
          Wait until you see the sunset version.
        </div>
      </div>
      <div className="flex items-center gap-3 rounded-2xl border border-border/60 bg-card/70 p-3">
        <ImageContainer
          src={landingImages.heroPanorama}
          alt="A calm lake at dusk"
          ratio="square"
          unoptimized
          sizes="80px"
          className="size-14 shrink-0"
        />
        <div className="min-w-0">
          <p className="text-sm font-medium">Sunset set</p>
          <p className="text-xs text-muted-foreground">Shared in a sample circle</p>
        </div>
        <StatusBadge tone="brand" className="ml-auto">
          Photo
        </StatusBadge>
      </div>
      <p className="text-xs text-muted-foreground">
        Illustrative conversation · messaging is not implemented yet
      </p>
    </div>
  );
}
