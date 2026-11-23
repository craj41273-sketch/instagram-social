"use client";

import { Grid3X3, Images } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Honest placeholders: no posts or tagged media exist until a later block. */
export function ProfileTabs() {
  return (
    <Tabs defaultValue="posts" className="gap-5">
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

      <TabsContent value="posts">
        <EmptyState
          icon={Grid3X3}
          title="Posts will appear here"
          description="Sharing is coming in a later block. Nothing is being simulated in this release."
        />
      </TabsContent>

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
