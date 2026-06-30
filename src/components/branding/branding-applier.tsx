import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

const GOOGLE_FONT_ALLOWLIST = new Set([
  "Inter",
  "Fraunces",
  "Roboto",
  "Open Sans",
  "Poppins",
  "Lato",
  "Montserrat",
  "Source Sans 3",
  "Nunito",
  "Work Sans",
  "Playfair Display",
  "Merriweather",
  "Lora",
  "DM Sans",
  "DM Serif Display",
  "Space Grotesk",
  "Manrope",
  "Plus Jakarta Sans",
  "IBM Plex Sans",
  "Crimson Pro",
]);

function sanitizeFont(name: string | null | undefined, fallback: string): string {
  if (!name) return fallback;
  return GOOGLE_FONT_ALLOWLIST.has(name) ? name : fallback;
}

function buildFontHref(heading: string, body: string): string {
  const families = Array.from(new Set([heading, body]))
    .map((f) => `family=${encodeURIComponent(f)}:wght@400;500;600;700`)
    .join("&");
  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
}

/**
 * Reads the singleton branding row and applies theme tokens at runtime:
 *   - --primary, --accent, --secondary, --radius CSS vars
 *   - --font-sans / --font-serif (heading vs body) via Google Fonts
 *   - <title>, favicon, theme-color updates
 *
 * Runs on the client only; SSR keeps the static defaults from styles.css.
 */
export function BrandingApplier() {
  const { data } = useQuery({
    queryKey: ["public-branding"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_public_branding");
      if (error) throw error;
      return data as Record<string, unknown> | null;
    },
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    if (!data) return;
    const root = document.documentElement;
    const set = (k: string, v?: unknown) => {
      if (typeof v === "string" && v.trim()) root.style.setProperty(k, v);
    };

    set("--primary", data.primary_color as string | undefined);
    set("--accent", data.accent_color as string | undefined);
    set("--secondary", data.secondary_color as string | undefined);

    const radius = typeof data.radius_rem === "number" ? data.radius_rem : null;
    if (radius !== null && radius >= 0 && radius <= 2) {
      root.style.setProperty("--radius", `${radius}rem`);
    }

    const heading = sanitizeFont(data.font_heading as string, "Fraunces");
    const body = sanitizeFont(data.font_body as string, "Inter");
    root.style.setProperty(
      "--font-sans",
      `"${body}", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif`,
    );
    root.style.setProperty(
      "--font-serif",
      `"${heading}", ui-serif, Georgia, "Times New Roman", serif`,
    );

    // Swap the Google Fonts stylesheet when fonts diverge from defaults.
    const linkId = "bca-branded-fonts";
    if (heading !== "Fraunces" || body !== "Inter") {
      const href = buildFontHref(heading, body);
      let link = document.getElementById(linkId) as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.id = linkId;
        link.rel = "stylesheet";
        document.head.appendChild(link);
      }
      if (link.href !== href) link.href = href;
    }

    // Title + favicon + theme-color
    if (typeof data.seo_title === "string" && data.seo_title.trim()) {
      document.title = data.seo_title;
    } else if (typeof data.site_name === "string" && data.site_name.trim()) {
      document.title = data.site_name;
    }

    if (typeof data.favicon_url === "string" && data.favicon_url.trim()) {
      let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
      if (!icon) {
        icon = document.createElement("link");
        icon.rel = "icon";
        document.head.appendChild(icon);
      }
      icon.href = data.favicon_url;
    }
  }, [data]);

  return null;
}

export const BRANDING_FONT_ALLOWLIST = Array.from(GOOGLE_FONT_ALLOWLIST);
