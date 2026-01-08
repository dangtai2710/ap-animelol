import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface IndexNowPingOptions {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function useIndexNowPing(options?: IndexNowPingOptions) {
  return useMutation({
    mutationFn: async (urls: string[]) => {
      if (urls.length === 0) return null;

      const response = await supabase.functions.invoke("indexnow-ping", {
        body: { urls },
      });

      if (response.error) {
        console.error("IndexNow ping error:", response.error);
        // Don't throw - we don't want to block the main operation
        return null;
      }

      return response.data;
    },
    onSuccess: (data) => {
      if (data) {
        console.log("IndexNow ping successful:", data);
        options?.onSuccess?.();
      }
    },
    onError: (error) => {
      console.error("IndexNow ping failed:", error);
      options?.onError?.(error as Error);
    },
  });
}

// Helper function to ping a single URL
export async function pingIndexNow(url: string): Promise<void> {
  try {
    await supabase.functions.invoke("indexnow-ping", {
      body: { urls: [url] },
    });
  } catch (error) {
    console.error("IndexNow ping error:", error);
  }
}

// Helper function to ping multiple URLs
export async function pingIndexNowBatch(urls: string[]): Promise<void> {
  if (urls.length === 0) return;
  
  try {
    await supabase.functions.invoke("indexnow-ping", {
      body: { urls },
    });
  } catch (error) {
    console.error("IndexNow batch ping error:", error);
  }
}
