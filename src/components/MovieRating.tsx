import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Star } from "lucide-react";
import { toast } from "sonner";

interface MovieRatingProps {
  movieId: string;
}

// Simple hash function for IP-like identifier
const getClientId = () => {
  let clientId = localStorage.getItem("movie_client_id");
  if (!clientId) {
    clientId = crypto.randomUUID();
    localStorage.setItem("movie_client_id", clientId);
  }
  return clientId;
};

export const MovieRating = ({ movieId }: MovieRatingProps) => {
  const [hoverRating, setHoverRating] = useState(0);
  const [userRating, setUserRating] = useState(0);
  const queryClient = useQueryClient();
  const clientId = getClientId();

  // Fetch average rating
  const { data: ratingStats } = useQuery({
    queryKey: ["movie-rating-stats", movieId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movie_ratings")
        .select("rating")
        .eq("movie_id", movieId);
      
      if (error) throw error;
      
      const ratings = data || [];
      const total = ratings.length;
      const average = total > 0 
        ? ratings.reduce((sum, r) => sum + r.rating, 0) / total 
        : 0;
      
      return { average: Math.round(average * 10) / 10, total };
    },
  });

  // Fetch user's existing rating
  const { data: existingRating } = useQuery({
    queryKey: ["movie-user-rating", movieId, clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("movie_ratings")
        .select("rating")
        .eq("movie_id", movieId)
        .eq("ip_hash", clientId)
        .maybeSingle();
      
      if (error) throw error;
      return data?.rating || 0;
    },
  });

  useEffect(() => {
    if (existingRating) {
      setUserRating(existingRating);
    }
  }, [existingRating]);

  // Submit rating mutation
  const ratingMutation = useMutation({
    mutationFn: async (rating: number) => {
      const { error } = await supabase
        .from("movie_ratings")
        .upsert(
          { movie_id: movieId, ip_hash: clientId, rating },
          { onConflict: "movie_id,ip_hash" }
        );
      
      if (error) throw error;
      return rating;
    },
    onSuccess: (rating) => {
      setUserRating(rating);
      queryClient.invalidateQueries({ queryKey: ["movie-rating-stats", movieId] });
      toast.success(`Bạn đã đánh giá ${rating} sao!`);
    },
    onError: () => {
      toast.error("Không thể đánh giá. Vui lòng thử lại.");
    },
  });

  const handleRating = (rating: number) => {
    ratingMutation.mutate(rating);
  };

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
      {/* Stars */}
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            className="p-0.5 transition-transform hover:scale-110"
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => handleRating(star)}
            disabled={ratingMutation.isPending}
          >
            <Star
              className={`h-6 w-6 ${
                star <= (hoverRating || userRating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="font-semibold text-yellow-400">
          {ratingStats?.average || 0}/5
        </span>
        <span>({ratingStats?.total || 0} lượt đánh giá)</span>
      </div>
    </div>
  );
};
