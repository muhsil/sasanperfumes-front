/**
 * Theme Configuration — ShapeHive Premium Black & White Luxury Palette
 * Single source of truth for all brand colors.
 * globals.css maps Tailwind color tokens to the CSS variables injected from here.
 *
 * Clean, minimal, luxury ecommerce design inspired by high-end Shopify themes.
 * Black-and-white with gold accent for premium aesthetic.
 */

export const themeConfig = {
  colors: {
    // Page background & text - clean black and white
    background: "#FFFFFF",       // Clean white background
    foreground: "#111111",       // Almost black text

    // Primary brand (black)
    primary: "#111111",          // Black for buttons and primary elements
    primaryDark: "#000000",       // Pure black for hover/active states
    primaryLight: "#333333",      // Dark gray for lighter variant

    // Neutrals - clean grayscale palette
    beige: "#F7F7F5",            // Off-white surface
    beigeDark: "#F1F1EE",        // Light gray surface
    brown: "#111111",            // Black (matches primary for consistency)
    brownLight: "#333333",       // Dark gray
    ivory: "#FFFFFF",            // Pure white
    greyBeige: "#E5E5E5",        // Light border gray
    darkBrown: "#000000",        // Pure black (matches primaryDark)
    gold: "#B9A06A",             // Warm gold accent

    // Additional colors for borders and UI elements
    border: "#E5E5E5",            // Light border color
    muted: "#6F6F6F",             // Medium gray for muted text
    sale: "#B3261E",              // Red for sale price
    success: "#1F7A4D",           // Green for success states
    warning: "#B7791F",           // Orange for warnings
  }
};
