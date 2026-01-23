import { forwardRef } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "gradient" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  children: React.ReactNode;
  asChild?: boolean;
}

export const ThemeButton = forwardRef<HTMLButtonElement, ThemeButtonProps>(
  ({ className, variant = "default", size = "default", children, asChild = false, style, ...props }, ref) => {
    
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

    const variantStyle: React.CSSProperties =
      variant === "gradient"
        ? { background: "var(--gradient-primary)", color: "hsl(var(--primary-foreground))" }
        : variant === "outline"
          ? {
              background: "transparent",
              color: "hsl(var(--primary))",
              borderColor: "hsl(var(--primary))",
            }
          : {
              background: "hsl(var(--primary))",
              backgroundColor: "hsl(var(--primary))",
              color: "hsl(var(--primary-foreground))",
              borderColor: "hsl(var(--primary))",
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
        style={{ ...variantStyle, ...style }}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

ThemeButton.displayName = "ThemeButton";
