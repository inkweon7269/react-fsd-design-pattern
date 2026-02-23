import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@/shared/ui";
import type { Post } from "../model/types";

interface PostCardProps {
  post: Post;
  onClick?: (postId: number) => void;
}

export function PostCard({ post, onClick }: PostCardProps) {
  const formattedDate = new Date(post.createdAt).toLocaleDateString();

  return (
    <Card
      className="cursor-pointer transition-shadow hover:shadow-md"
      onClick={() => onClick?.(post.id)}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{post.title}</CardTitle>
          <Badge variant={post.isPublished ? "default" : "secondary"}>
            {post.isPublished ? "Published" : "Draft"}
          </Badge>
        </div>
        <CardDescription>{formattedDate}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {post.content}
        </p>
      </CardContent>
    </Card>
  );
}
