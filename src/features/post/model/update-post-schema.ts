import * as yup from "yup";

export const updatePostSchema = yup.object({
  title: yup
    .string()
    .required("Title is required")
    .max(200, "Title must be 200 characters or less"),
  content: yup
    .string()
    .required("Content is required"),
  isPublished: yup.boolean().default(false),
});

export type UpdatePostFormValues = yup.InferType<typeof updatePostSchema>;
