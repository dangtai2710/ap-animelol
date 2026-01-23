import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTheme } from "@/components/ThemeProvider";

interface ThemeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "gradient" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  children: React.ReactNode;
  asChild?: boolean;
}

export const ThemeButton = forwardRef<HTMLButtonElement, ThemeButtonProps>(
  ({ className, variant = "default", size = "default", children, asChild = false, style, ...props }, ref) => {
    const { theme } = useTheme();
    
    const getVariantClasses = () => {
      switch (variant) {
        case "gradient":
          return "bg-gradient-primary hover:opacity-90 text-primary-foreground shadow-lg";
        case "outline":
          return "border-2 border-primary bg-transparent text-primary hover:bg-primary hover:text-primary-foreground";
        default:
          return "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md";
      }
    };

    // Convert hex to HSL for inline styles
    const hexToHsl = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return '0 0% 50%';
      
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

    // Force inline styles to override any CSS conflicts
    const forceStyles = {
      background: `hsl(${hexToHsl(theme.primaryColor)})`,
      backgroundColor: `hsl(${hexToHsl(theme.primaryColor)})`,
      color: 'white',
      borderColor: `hsl(${hexToHsl(theme.primaryColor)})`,
      ...style
    };

    return (
      <Button
        ref={ref}
        className={cn(
          getVariantClasses(),
          "transition-all duration-200 font-medium theme-button",
          className
        )}
        size={size}
        asChild={asChild}
        style={forceStyles}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

ThemeButton.displayName = "ThemeButton";
