import { useForm } from "react-hook-form";
import { DevTool } from "@hookform/devtools";
import { yupResolver } from "@hookform/resolvers/yup";
import {
  Button,
  Input,
  Textarea,
  Switch,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui";
import {
  updatePostSchema,
  type UpdatePostFormValues,
} from "../model/update-post-schema";
import { useUpdatePost } from "../api/use-update-post";

interface UpdatePostFormProps {
  postId: number;
  defaultValues: UpdatePostFormValues;
  onSuccess?: () => void;
}

export function UpdatePostForm({
  postId,
  defaultValues,
  onSuccess,
}: UpdatePostFormProps) {
  const updatePost = useUpdatePost();

  const form = useForm<UpdatePostFormValues>({
    resolver: yupResolver(updatePostSchema),
    defaultValues,
  });

  function onSubmit(values: UpdatePostFormValues) {
    updatePost.mutate(
      { id: postId, dto: values },
      {
        onSuccess: () => {
          onSuccess?.();
        },
      },
    );
  }

  return (
    <>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input placeholder="Enter post title..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Write your post content..."
                  className="min-h-[200px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isPublished"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <FormLabel className="text-base">Publish</FormLabel>
                <FormDescription>
                  Make this post publicly visible
                </FormDescription>
              </div>
              <FormControl>
                <Switch
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={updatePost.isPending}
          className="w-full"
        >
          {updatePost.isPending ? "Updating..." : "Update Post"}
        </Button>

        {updatePost.isError && (
          <p className="text-sm text-destructive">
            Failed to update post. Please try again.
          </p>
        )}
      </form>
    </Form>
    <DevTool control={form.control} />
    </>
  );
}
