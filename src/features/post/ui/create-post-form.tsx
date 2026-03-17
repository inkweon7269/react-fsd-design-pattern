import { useForm } from "react-hook-form";
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
  FormDevTool,
} from "@/shared/ui";
import {
  createPostSchema,
  type CreatePostFormValues,
} from "../model/create-post-schema";
import { useCreatePost } from "../api/use-create-post";

interface CreatePostFormProps {
  onSuccess?: (postId: number) => void;
}

export function CreatePostForm({ onSuccess }: CreatePostFormProps) {
  const createPost = useCreatePost();

  const form = useForm<CreatePostFormValues>({
    resolver: yupResolver(createPostSchema),
    defaultValues: {
      title: "",
      content: "",
      isPublished: false,
    },
  });

  function onSubmit(values: CreatePostFormValues) {
    createPost.mutate(values, {
      onSuccess: (result) => {
        form.reset();
        onSuccess?.(result.id);
      },
    });
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
          disabled={createPost.isPending}
          className="w-full"
        >
          {createPost.isPending ? "Creating..." : "Create Post"}
        </Button>

        {createPost.isError && (
          <p className="text-sm text-destructive">
            Failed to create post. Please try again.
          </p>
        )}
      </form>
    </Form>
    <FormDevTool control={form.control} />
    </>
  );
}
