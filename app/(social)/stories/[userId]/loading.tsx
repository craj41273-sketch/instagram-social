import { Skeleton } from "@/components/ui/skeleton";

export default function StoryViewerLoading() {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black p-4">
      <div className="relative h-full w-full max-w-[440px] overflow-hidden rounded-2xl bg-white/5 sm:h-[min(94vh,900px)]">
        <Skeleton className="absolute inset-0 rounded-none bg-white/10" />
        <Skeleton className="absolute inset-x-4 top-6 h-1 rounded-full bg-white/20" />
        <Skeleton className="absolute inset-x-4 top-12 size-10 rounded-full bg-white/10" />
      </div>
    </div>
  );
}
