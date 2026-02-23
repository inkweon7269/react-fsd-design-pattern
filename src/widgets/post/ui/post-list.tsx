import { usePosts, PostCard } from "@/entities/post";
import type { GetPostsParams } from "@/entities/post";
import { Button, Skeleton } from "@/shared/ui";

interface PostListProps {
  params: GetPostsParams;
  onPageChange: (page: number) => void;
  onPostClick: (postId: number) => void;
}

export function PostList({ params, onPageChange, onPostClick }: PostListProps) {
  const { data, isLoading, isError, error } = usePosts(params);

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: params.limit ?? 10 }).map((_, i) => (
          <Skeleton key={i} className="h-[140px] w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="py-8 text-center text-destructive">
        <p>Failed to load posts: {error.message}</p>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        <p>No posts found.</p>
      </div>
    );
  }

  const totalPages = Math.ceil(data.totalElements / data.limit);
  const currentPage = data.page;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {data.items.map((post) => (
          <PostCard key={post.id} post={post} onClick={onPostClick} />
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
