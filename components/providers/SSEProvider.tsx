"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";

export default function SSEProvider() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const es = new EventSource("/api/sse");

    es.addEventListener("post_status_changed", (e) => {
      const data = JSON.parse(e.data);
      queryClient.invalidateQueries({ queryKey: ["posts"] });
      queryClient.invalidateQueries({ queryKey: ["post", data.postId] });
    });

    es.addEventListener("channel_expired", () => {
      queryClient.invalidateQueries({ queryKey: ["channels"] });
    });

    return () => es.close();
  }, [queryClient]);

  return null;
}
