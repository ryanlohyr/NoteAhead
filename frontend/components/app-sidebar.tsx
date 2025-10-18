"use client";

import { FileText, FolderOpen, PenSquare } from "lucide-react";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useGetAllNotes } from "@/query/notes";

// Menu items
const items = [
  {
    title: "Notes",
    url: "/",
    icon: FileText,
  },
  {
    title: "Files",
    url: "/files",
    icon: FolderOpen,
  },
];

export function AppSidebar() {
  const { data: notesData } = useGetAllNotes();
  const notes = notesData?.notes || [];
  const displayedNotes = notes.slice(0, 4);
  const hasMoreNotes = notes.length > 4;

  return (
    <Sidebar collapsible="icon">
      <SidebarRail />
      <SidebarHeader>
        <div className="flex items-center gap-2 p-4 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
          <SidebarTrigger />
          <h2 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            NoteAhead
          </h2>
        </div>
        <div className="px-4 pb-4 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          {/* Collapsed state button */}
          <div className="group-data-[collapsible=icon]:block hidden">
            <Link href="/notes/new">
              <Button
                variant="outline"
                className="w-8 h-8 p-0 rounded-full"
                size="sm"
              >
                <PenSquare className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {/* Expanded state button */}
          <div className="group-data-[collapsible=icon]:hidden block w-full">
            <Button 
              className="w-full" 
              variant="outline" 
              size="default"
              asChild
            >
              <Link href="/notes/new">
                <PenSquare className="mr-2 h-4 w-4" />
                <span className="text-sm">New Note</span>
              </Link>
            </Button>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <div key={item.title}>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild>
                      <Link href={item.url}>
                        <item.icon className="h-5 w-5 group-data-[collapsible=icon]:h-5 group-data-[collapsible=icon]:w-5" />
                        <span className="text-sm">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  
                  {/* Show notes under Notes section */}
                  {item.title === "Notes" && (
                    <div className="ml-4 group-data-[collapsible=icon]:hidden">
                      {displayedNotes.map((note) => (
                        <SidebarMenuItem key={note.id}>
                          <SidebarMenuButton asChild>
                            <Link href={`/notes/${note.id}`}>
                              <span className="text-xs truncate">{note.title || "Untitled"}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                      
                      {hasMoreNotes && (
                        <SidebarMenuItem>
                          <SidebarMenuButton asChild>
                            <Link href="/">
                              <span className="text-xs text-muted-foreground">See more...</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>

      </SidebarFooter>
    </Sidebar>
  );
}

