import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface ThemeSettings {
  primaryColor: string;
  fontFamily: string;
  language: "vi" | "en";
}

interface ThemeContextType {
  theme: ThemeSettings;
  isLoading: boolean;
}

const defaultTheme: ThemeSettings = {
  primaryColor: "#e11d48",
  fontFamily: "Be Vietnam Pro",
  language: "vi",
};

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  isLoading: true,
});

export const useTheme = () => useContext(ThemeContext);

// Google Fonts mapping
const googleFonts: Record<string, string> = {
  "Be Vietnam Pro": "Be+Vietnam+Pro:wght@300;400;500;600;700;800",
  "Inter": "Inter:wght@300;400;500;600;700;800",
  "Roboto": "Roboto:wght@300;400;500;700",
  "Open Sans": "Open+Sans:wght@300;400;500;600;700;800",
  "Montserrat": "Montserrat:wght@300;400;500;600;700;800",
  "Poppins": "Poppins:wght@300;400;500;600;700;800",
  "Nunito": "Nunito:wght@300;400;500;600;700;800",
  "Quicksand": "Quicksand:wght@300;400;500;600;700",
  "Lexend": "Lexend:wght@300;400;500;600;700;800",
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setTheme] = useState<ThemeSettings>(() => {
    // Try to use preloaded theme from window or localStorage
    if (typeof window !== 'undefined') {
      try {
        // Check for preloaded theme first
        if (window.preloadedTheme) {
          return window.preloadedTheme;
        }
        
        // Fallback to localStorage
        const savedTheme = localStorage.getItem('theme-settings');
        if (savedTheme) {
          return JSON.parse(savedTheme);
        }
      } catch (e) {
        console.log('Error loading saved theme:', e);
      }
    }
    return defaultTheme;
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ["theme-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["theme_primary_color", "theme_font_family", "site_language"]);
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (settings) {
      const newTheme: ThemeSettings = { ...defaultTheme };
      
      settings.forEach(s => {
        if (s.setting_key === "theme_primary_color" && s.setting_value) {
          newTheme.primaryColor = s.setting_value;
        }
        if (s.setting_key === "theme_font_family" && s.setting_value) {
          newTheme.fontFamily = s.setting_value;
        }
        if (s.setting_key === "site_language" && s.setting_value) {
          newTheme.language = s.setting_value as "vi" | "en";
        }
      });
      
      setTheme(newTheme);
      
      // Save to localStorage for faster loading next time
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme-settings', JSON.stringify(newTheme));
      }
    }
  }, [settings]);

  // Apply theme to CSS variables
  useEffect(() => {
    const root = document.documentElement;
    
    // Convert hex to HSL for primary color
    const hexToHsl = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return null;
      
      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0;
      const l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    // Apply primary color
    const hsl = hexToHsl(theme.primaryColor);
    if (hsl) {
      root.style.setProperty("--primary", hsl);
      root.style.setProperty("--ring", hsl);
      root.style.setProperty("--sidebar-primary", hsl);
      root.style.setProperty("--cinema-red", hsl);
      
      // Create gradient from primary color
      const [h, s, l] = hsl.split(' ');
      const lighterHsl = `${h} ${s} ${Math.min(parseInt(l) + 10, 90)}%`;
      const darkerHsl = `${h} ${s} ${Math.max(parseInt(l) - 10, 20)}%`;
      const gradient = `linear-gradient(135deg, ${lighterHsl} 0%, ${darkerHsl} 100%)`;
      root.style.setProperty("--gradient-primary", gradient);
    }

    // Apply font family
    root.style.setProperty("--font-family", `'${theme.fontFamily}', sans-serif`);
    document.body.style.fontFamily = `'${theme.fontFamily}', sans-serif`;

    // Load Google Font if needed
    const fontUrl = googleFonts[theme.fontFamily];
    if (fontUrl) {
      const existingLink = document.querySelector(`link[data-font="${theme.fontFamily}"]`);
      if (!existingLink) {
        const link = document.createElement("link");
        link.href = `https://fonts.googleapis.com/css2?family=${fontUrl}&display=swap`;
        link.rel = "stylesheet";
        link.setAttribute("data-font", theme.fontFamily);
        document.head.appendChild(link);
      }
    }

    // Set language attribute
    document.documentElement.lang = theme.language;
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  );
};

export { googleFonts };
