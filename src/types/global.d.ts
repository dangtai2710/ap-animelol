export {};

declare global {
  interface Window {
    preloadedTheme: {
      primaryColor: string;
      fontFamily: string;
      language: string;
    };
  }
}
