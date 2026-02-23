export interface CreatePostDto {
  title: string;
  content: string;
  isPublished?: boolean;
}

export interface CreatePostResponse {
  id: number;
}
