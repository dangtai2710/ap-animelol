// Force theme colors to apply immediately
(function() {
  console.log('=== FORCING THEME COLORS ===');
  
  // Get current theme from localStorage or use default
  let currentTheme = {
    primaryColor: "#e11d48",
    fontFamily: "Be Vietnam Pro", 
    language: "vi"
  };
  
  try {
    const saved = localStorage.getItem('theme-settings');
    if (saved) {
      currentTheme = JSON.parse(saved);
      console.log('Found saved theme:', currentTheme);
    }
  } catch (e) {
    console.log('No saved theme, using default');
  }
  
  const root = document.documentElement;
  
  // Convert hex to HSL
  function hexToHsl(hex) {
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
  }
  
  // Apply theme colors
  const hsl = hexToHsl(currentTheme.primaryColor);
  if (hsl) {
    console.log('Applying HSL:', hsl);
    
    // Set CSS variables with !important override
    root.style.setProperty('--primary', hsl, 'important');
    root.style.setProperty('--ring', hsl, 'important');
    root.style.setProperty('--sidebar-primary', hsl, 'important');
    root.style.setProperty('--cinema-red', hsl, 'important');
    
    // Create gradient
    const [h, s, l] = hsl.split(' ');
    const lighterHsl = `${h} ${s} ${Math.min(parseInt(l) + 15, 95)}%`;
    const darkerHsl = `${h} ${s} ${Math.max(parseInt(l) - 15, 15)}%`;
    const gradient = `linear-gradient(135deg, ${lighterHsl} 0%, ${darkerHsl} 100%)`;
    
    root.style.setProperty('--gradient-primary', gradient, 'important');
    
    console.log('Applied gradient:', gradient);
  }
  
  // Force button colors every 100ms for first 5 seconds
  let attempts = 0;
  const forceInterval = setInterval(() => {
    attempts++;
    console.log(`Force attempt ${attempts}`);
    
    // Find all buttons and force their colors
    const buttons = document.querySelectorAll('button, a[href*="/phim/"]');
    buttons.forEach((btn, index) => {
      if (btn.textContent.includes('Xem') || btn.textContent.includes('Play')) {
        console.log(`Forcing button ${index}:`, btn.textContent);
        btn.style.setProperty('background', `hsl(${hsl})`, 'important');
        btn.style.setProperty('background-color', `hsl(${hsl})`, 'important');
        btn.style.setProperty('color', 'white', 'important');
        btn.style.setProperty('border-color', `hsl(${hsl})`, 'important');
      }
    });
    
    if (attempts >= 50) { // 5 seconds
      clearInterval(forceInterval);
      console.log('Stopped forcing colors');
    }
  }, 100);
  
  // Also force immediately
  setTimeout(() => {
    const buttons = document.querySelectorAll('button, a[href*="/phim/"]');
    buttons.forEach((btn) => {
      if (btn.textContent.includes('Xem') || btn.textContent.includes('Play')) {
        btn.style.setProperty('background', `hsl(${hsl})`, 'important');
        btn.style.setProperty('background-color', `hsl(${hsl})`, 'important');
        btn.style.setProperty('color', 'white', 'important');
      }
    });
  }, 1000);
  
  console.log('=== THEME FORCING COMPLETE ===');
})();
