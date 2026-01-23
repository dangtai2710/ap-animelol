// Debug theme variables
(function() {
  console.log('=== THEME DEBUG ===');
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  console.log('CSS Variables:');
  console.log('--primary:', computedStyle.getPropertyValue('--primary'));
  console.log('--gradient-primary:', computedStyle.getPropertyValue('--gradient-primary'));
  console.log('--cinema-red:', computedStyle.getPropertyValue('--cinema-red'));
  
  // Check if preloadedTheme exists
  if (window.preloadedTheme) {
    console.log('Preloaded theme:', window.preloadedTheme);
  } else {
    console.log('No preloaded theme found');
  }
  
  // Check button elements
  const buttons = document.querySelectorAll('button');
  console.log('Buttons found:', buttons.length);
  
  buttons.forEach((btn, index) => {
    if (btn.textContent.includes('Xem') || btn.textContent.includes('Play')) {
      console.log(`Button ${index}:`, {
        text: btn.textContent,
        classes: btn.className,
        computedBg: getComputedStyle(btn).backgroundColor,
        computedBgImage: getComputedStyle(btn).backgroundImage
      });
    }
  });
  
  console.log('=== END DEBUG ===');
})();
