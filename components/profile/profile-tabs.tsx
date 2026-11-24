"use client";

import type { ReactNode } from "react";
import { Grid3X3, Images } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Posts come from Neon; tagged media stays honestly empty until tagging exists. */
export function ProfileTabs({ posts }: { posts: ReactNode }) {
  return (
    <Tabs defaultValue="posts" className="gap-5" id="posts">
      <TabsList variant="line" className="w-full justify-center rounded-none border-b border-border/70">
        <TabsTrigger value="posts">
          <Grid3X3 aria-hidden="true" />
          Posts
        </TabsTrigger>
        <TabsTrigger value="tagged">
          <Images aria-hidden="true" />
          Tagged
        </TabsTrigger>
      </TabsList>

      <TabsContent value="posts">{posts}</TabsContent>

      <TabsContent value="tagged">
        <EmptyState
          icon={Images}
          title="No tagged media yet"
          description="When tagging arrives, photos someone shares with you will live here."
        />
      </TabsContent>
    </Tabs>
  );
}
