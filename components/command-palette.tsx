"use client";

import { useRouter } from "next/navigation";
import {
  BookOpenIcon,
  BriefcaseIcon,
  ChartColumnIcon,
  CopyIcon,
  FileTextIcon,
  ImageIcon,
  MailIcon,
  MoonStarIcon,
  MusicIcon,
  ServerIcon,
  UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";
import { useAudio } from "@/contexts/audio-context";
import { RESUME_PATH, profile } from "@/lib/content";
import { toggleTheme } from "@/lib/theme";
import { GithubMark, LinkedinMark } from "./brand-icons";
import { trackEvent } from "./site-analytics";

/** The ⌘K dialog itself. Loaded on first use by CommandMenu, so cmdk stays out of the initial bundle. */
export default function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const { isPlaying, togglePlay } = useAudio();

  const run = (action: () => void) => {
    onOpenChange(false);
    action();
  };

  const go = (href: string) => run(() => router.push(href));
  const visit = (href: string, event: string) =>
    run(() => {
      trackEvent(event);
      window.open(href, "_blank", "noopener,noreferrer");
    });

  const copyEmail = () =>
    run(async () => {
      try {
        await navigator.clipboard.writeText(profile.email);
        trackEvent("email-copy");
        toast.success("Email address copied", { description: profile.email });
      } catch {
        window.location.href = `mailto:${profile.email}`;
      }
    });

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command menu"
      description="Jump to a section or run an action"
      className="top-[12vh]"
    >
      <Command className="bg-paper">
        <CommandInput placeholder="Type a command or search" />
        {/* Tall enough for every command on a 900px-tall screen; shorter screens scroll. */}
        <CommandList className="max-h-[min(36rem,calc(88vh-6rem))] scroll-pb-2 pb-1">
          <CommandEmpty>Nothing matches that.</CommandEmpty>
          <CommandGroup heading="Go to">
            <CommandItem keywords={["projects", "portfolio"]} onSelect={() => go("/#work")}>
              <BriefcaseIcon /> Work
            </CommandItem>
            <CommandItem keywords={["jobs", "career", "education"]} onSelect={() => go("/#experience")}>
              <UserIcon /> Experience
            </CommandItem>
            <CommandItem keywords={["simulator", "demo", "system design", "play"]} onSelect={() => go("/#play")}>
              <ServerIcon /> The system you can break
            </CommandItem>
            <CommandItem keywords={["blog", "posts", "articles"]} onSelect={() => go("/blogs")}>
              <BookOpenIcon /> Writing
            </CommandItem>
            <CommandItem keywords={["photos", "pictures"]} onSelect={() => go("/gallery")}>
              <ImageIcon /> Gallery
            </CommandItem>
            <CommandItem keywords={["analytics", "visits"]} onSelect={() => go("/stats")}>
              <ChartColumnIcon /> Site stats
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Get in touch">
            <CommandItem keywords={["email", "contact", "clipboard"]} onSelect={copyEmail}>
              <CopyIcon /> Copy email address
            </CommandItem>
            <CommandItem
              keywords={["contact", "mail"]}
              onSelect={() =>
                run(() => {
                  trackEvent("email");
                  window.location.href = `mailto:${profile.email}`;
                })
              }
            >
              <MailIcon /> Write an email
            </CommandItem>
            <CommandItem
              keywords={["resume", "cv", "pdf"]}
              onSelect={() =>
                run(() => {
                  trackEvent("resume-download");
                  window.open(RESUME_PATH, "_blank");
                })
              }
            >
              <FileTextIcon /> Open the résumé
            </CommandItem>
            <CommandItem keywords={["linkedin", "profile"]} onSelect={() => visit(profile.linkedin, "linkedin")}>
              <LinkedinMark /> LinkedIn
            </CommandItem>
            <CommandItem keywords={["github", "code", "repositories"]} onSelect={() => visit(profile.github, "github")}>
              <GithubMark /> GitHub
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Settings">
            <CommandItem keywords={["dark", "light", "mode", "theme"]} onSelect={() => run(() => toggleTheme())}>
              <MoonStarIcon /> Switch theme
              <CommandShortcut>light / dark</CommandShortcut>
            </CommandItem>
            <CommandItem keywords={["music", "sound", "audio", "background"]} onSelect={() => run(togglePlay)}>
              <MusicIcon /> {isPlaying ? "Pause background music" : "Play background music"}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
