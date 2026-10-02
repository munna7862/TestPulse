"use client";

import * as React from "react";
import { Bell, Building2, ChevronDown, Layers, Menu, User } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  IconButton,
  ThemeToggle,
} from "@testpulse/ui";
import { useTheme } from "../providers/ThemeProvider";
import { Breadcrumbs } from "./Breadcrumbs";
import { ConnectionStatusPill } from "./ConnectionStatusPill";

interface AppHeaderProps {
  onMobileMenuToggle?: () => void;
}

export function AppHeader({ onMobileMenuToggle }: AppHeaderProps) {
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        {onMobileMenuToggle && (
          <IconButton
            size="sm"
            variant="ghost"
            aria-label="Open navigation menu"
            onClick={onMobileMenuToggle}
            className="md:hidden"
          >
            <Menu className="h-5 w-5" />
          </IconButton>
        )}

        {/* Org & Project Switcher Placeholder */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 font-normal text-xs h-8 border-border bg-background/50 hover:bg-muted"
            >
              <Building2 className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="font-semibold text-foreground">Acme Corp</span>
              <span className="text-muted-foreground">/</span>
              <Layers className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-foreground">Core Engine</span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50 shrink-0" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Organizations</DropdownMenuLabel>
            <DropdownMenuItem className="font-medium">Acme Corp (Owner)</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Projects</DropdownMenuLabel>
            <DropdownMenuItem className="font-medium text-primary">✓ Core Engine</DropdownMenuItem>
            <DropdownMenuItem>Web Client</DropdownMenuItem>
            <DropdownMenuItem>Backend API</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden lg:block h-4 w-px bg-border mx-1" aria-hidden="true" />
        <div className="hidden lg:block">
          <Breadcrumbs />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ConnectionStatusPill status="live" />

        {/* Notifications Bell */}
        <IconButton size="sm" variant="ghost" aria-label="Notifications" className="relative">
          <Bell className="h-4 w-4 text-muted-foreground" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
        </IconButton>

        {/* Theme Toggle */}
        <ThemeToggle theme={theme} setTheme={setTheme} />

        {/* User Profile Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="User account menu"
              className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-primary/10 text-primary font-medium text-xs hover:bg-primary/20 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <User className="h-4 w-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>
              <div className="flex flex-col">
                <span className="font-medium text-sm">Alex Rivers</span>
                <span className="text-xs text-muted-foreground">alex@testpulse.dev</span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile & Account</DropdownMenuItem>
            <DropdownMenuItem>Organization Settings</DropdownMenuItem>
            <DropdownMenuItem>API Keys</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive font-medium">Log Out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
