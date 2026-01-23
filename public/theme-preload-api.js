// Enhanced theme preload with API fetching
(function() {
  // Default theme
  const defaultTheme = {
    primaryColor: "#e11d48",
    fontFamily: "Be Vietnam Pro",
    language: "vi"
  };

  // Apply theme function
  function applyTheme(theme) {
    const root = document.documentElement;
    
    // Convert hex to HSL for primary color
    const hexToHsl = (hex) => {
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
      
      // Update meta theme-color
      const metaThemeColor = document.querySelector('meta[name="theme-color"]');
      if (metaThemeColor) {
        metaThemeColor.content = theme.primaryColor;
      }
    }

    // Apply font family
    root.style.setProperty("--font-family", `'${theme.fontFamily}', sans-serif`);
    document.body.style.fontFamily = `'${theme.fontFamily}', sans-serif`;

    // Preload Google Font
    const googleFonts = {
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
  }

  // Try to load saved theme from localStorage first (fastest)
  try {
    const savedTheme = localStorage.getItem('theme-settings');
    if (savedTheme) {
      const theme = JSON.parse(savedTheme);
      applyTheme(theme);
      window.preloadedTheme = theme;
      return; // Exit early if we have saved theme
    }
  } catch (e) {
    console.log('No saved theme found in localStorage');
  }

  // Apply default theme immediately
  applyTheme(defaultTheme);
  window.preloadedTheme = defaultTheme;

  // Try to fetch latest theme from API (async, non-blocking)
  try {
    // This is a simplified fetch - in production you might want to use your actual API endpoint
    const apiUrl = window.location.origin + '/api/theme-settings';
    
    fetch(apiUrl)
      .then(response => response.json())
      .then(data => {
        if (data && data.primaryColor) {
          applyTheme(data);
          window.preloadedTheme = data;
          // Save to localStorage for next time
          localStorage.setItem('theme-settings', JSON.stringify(data));
        }
      })
      .catch(err => {
        console.log('Could not fetch theme settings:', err);
        // Keep using default/saved theme
      });
  } catch (e) {
    console.log('API fetch not available, using default theme');
  }
})();
