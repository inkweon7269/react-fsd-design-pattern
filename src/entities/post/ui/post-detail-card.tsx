import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Separator,
} from "@/shared/ui";
import type { Post } from "../model/types";

interface PostDetailCardProps {
  post: Post;
}

export function PostDetailCard({ post }: PostDetailCardProps) {
  const createdDate = new Date(post.createdAt).toLocaleDateString();
  const updatedDate = new Date(post.updatedAt).toLocaleDateString();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl">{post.title}</CardTitle>
          <Badge variant={post.isPublished ? "default" : "secondary"}>
            {post.isPublished ? "Published" : "Draft"}
          </Badge>
        </div>
        <CardDescription>
          Created: {createdDate} | Updated: {updatedDate}
        </CardDescription>
      </CardHeader>
      <Separator />
      <CardContent className="pt-6">
        <p className="whitespace-pre-wrap text-base leading-relaxed">
          {post.content}
        </p>
      </CardContent>
    </Card>
  );
}
