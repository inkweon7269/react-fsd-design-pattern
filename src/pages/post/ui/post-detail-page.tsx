import { useNavigate, useParams } from "@tanstack/react-router";
import { usePost, PostDetailCard } from "@/entities/post";
import { DeletePostButton } from "@/features/post";
import { Button, Skeleton } from "@/shared/ui";

export function PostDetailPage() {
  const { postId } = useParams({ from: "/posts/$postId" });
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
      <div className="mb-4 flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => navigate({ to: "/posts" })}
        >
          &larr; Back to Posts
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              navigate({ to: "/posts/$postId/edit", params: { postId } })
            }
          >
            Edit
          </Button>
          <DeletePostButton
            postId={Number(postId)}
            onSuccess={() => navigate({ to: "/posts" })}
          />
        </div>
      </div>
      <PostDetailCard post={post} />
    </div>
  );
}
