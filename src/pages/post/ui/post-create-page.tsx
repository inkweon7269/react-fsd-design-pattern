import { useNavigate } from "@tanstack/react-router";
import { CreatePostForm } from "@/features/post";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui";

export function PostCreatePage() {
  const navigate = useNavigate();

  function handleSuccess(postId: number) {
    navigate({ to: "/posts/$postId", params: { postId: String(postId) } });
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Post</CardTitle>
        </CardHeader>
        <CardContent>
          <CreatePostForm onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}
