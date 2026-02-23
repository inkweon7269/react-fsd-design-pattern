import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { PostList } from "@/widgets/post";
import type { GetPostsParams } from "@/entities/post";

export function PostListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useState<GetPostsParams>({
    page: 1,
    limit: 10,
  });

  function handlePageChange(page: number) {
    setParams((prev) => ({ ...prev, page }));
  }

  function handlePostClick(postId: number) {
    navigate({ to: "/posts/$postId", params: { postId: String(postId) } });
  }

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Posts</h1>
        <p className="mt-2 text-muted-foreground">
          Browse and manage your posts
        </p>
      </div>
      <PostList
        params={params}
        onPageChange={handlePageChange}
        onPostClick={handlePostClick}
      />
    </div>
  );
}
