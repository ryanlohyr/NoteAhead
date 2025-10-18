"use client";

import { FileText, FolderOpen, Plus } from "lucide-react";
import Link from "next/link";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

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
  return (
    <Sidebar collapsible="icon">
      <SidebarRail />
      <SidebarHeader>
        <div className="flex items-center gap-2 p-4">
          <SidebarTrigger />
          <h2 className="text-lg font-semibold group-data-[collapsible=icon]:hidden">
            NoteAhead
          </h2>
        </div>
        <div className="px-4 pb-4 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-2">
          {/* Collapsed state button */}
          <div className="group-data-[collapsible=icon]:block hidden">
            <Link href="/notes/new">
              <Button
                variant="default"
                className="w-8 h-8 p-0 rounded-full"
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          {/* Expanded state button */}
          <div className="group-data-[collapsible=icon]:hidden block w-full">
            <Button 
              className="w-full" 
              variant="default" 
              size="default"
              asChild
            >
              <Link href="/notes/new">
                <Plus className="mr-2 h-4 w-4" />
                <span>New Note</span>
              </Link>
            </Button>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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

