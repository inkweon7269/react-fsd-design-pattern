import { useNavigate, useParams } from "@tanstack/react-router";
import { usePost } from "@/entities/post";
import { UpdatePostForm } from "@/features/post";
import { Button, Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/shared/ui";

export function PostEditPage() {
  const { postId } = useParams({ strict: false }) as { postId: string };
  const navigate = useNavigate();
  const id = Number(postId);
  const { data: post, isLoading, isError, error } = usePost(id);

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="h-[500px] w-full rounded-lg" />
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
        onClick={() => navigate({ to: "/posts/$postId", params: { postId } })}
      >
        &larr; Back to Post
      </Button>
      <Card>
        <CardHeader>
          <CardTitle>Edit Post</CardTitle>
        </CardHeader>
        <CardContent>
          <UpdatePostForm
            postId={id}
            defaultValues={{
              title: post.title,
              content: post.content,
              isPublished: post.isPublished,
            }}
            onSuccess={() =>
              navigate({ to: "/posts/$postId", params: { postId } })
            }
          />
        </CardContent>
      </Card>
    </div>
  );
}
