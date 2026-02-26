import {
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui";
import { useDeletePost } from "../api/use-delete-post";

interface DeletePostButtonProps {
  postId: number;
  onSuccess?: () => void;
}

export function DeletePostButton({ postId, onSuccess }: DeletePostButtonProps) {
  const deletePost = useDeletePost();

  function handleDelete() {
    deletePost.mutate(postId, {
      onSuccess: () => {
        onSuccess?.();
      },
    });
  }

  return (
    <div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" disabled={deletePost.isPending}>
            {deletePost.isPending ? "Deleting..." : "Delete"}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {deletePost.isError && (
        <p className="text-sm text-destructive">
          Failed to delete post. Please try again.
        </p>
      )}
    </div>
  );
}
