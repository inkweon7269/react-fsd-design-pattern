import { useNavigate, useParams } from "@tanstack/react-router";
import { usePost, PostDetailCard } from "@/entities/post";
import { Button, Skeleton } from "@/shared/ui";

export function PostDetailPage() {
  const { postId } = useParams({ strict: false }) as { postId: string };
  const navigate = useNavigate();
  const { data: post, isLoading, isError, error } = usePost(Number(postId));

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-[400px] w-full rounded-lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8 text-center">
        <p className="text-destructive">Failed to load post: {error.message}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate({ to: "/posts" })}
        >
          Back to Posts
        </Button>
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate({ to: "/posts" })}
      >
        &larr; Back to Posts
      </Button>
      <PostDetailCard post={post} />
    </div>
  );
}
