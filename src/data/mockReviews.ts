export interface MockReview {
  id: string;
  reviewer_name: string;
  reviewer_avatar: string;
  rating: number;
  comment: string;
  created_at: string;
  role: "guest_reviewing_host" | "host_reviewing_guest";
}

// Keyed by host_name (using the mock listings' host_name as the user "id")
export const mockReviews: Record<string, MockReview[]> = {
  Yasmine: [
    {
      id: "r1",
      reviewer_name: "Tom",
      reviewer_avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80",
      rating: 5,
      comment: "Yasmine welcomed us like family. The tagine was unreal.",
      created_at: "2026-04-12",
      role: "guest_reviewing_host",
    },
    {
      id: "r2",
      reviewer_name: "Sofía",
      reviewer_avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=120&q=80",
      rating: 5,
      comment: "Best mint tea I've had outside of Marrakech.",
      created_at: "2026-03-28",
      role: "guest_reviewing_host",
    },
  ],
  Marco: [
    {
      id: "r3",
      reviewer_name: "Aiko",
      reviewer_avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&q=80",
      rating: 5,
      comment: "Three pastas, three glasses of wine, three hours of stories. Worth every euro.",
      created_at: "2026-05-02",
      role: "guest_reviewing_host",
    },
  ],
  Elena: [
    {
      id: "r4",
      reviewer_name: "Hugo",
      reviewer_avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&q=80",
      rating: 5,
      comment: "Showed up on a Saturday with a still-warm cake. That's the dream.",
      created_at: "2026-04-30",
      role: "guest_reviewing_host",
    },
  ],
};
