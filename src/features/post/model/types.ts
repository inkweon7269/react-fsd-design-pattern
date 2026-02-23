export interface CreatePostDto {
  title: string;
  content: string;
  isPublished?: boolean;
}

export interface CreatePostResponse {
  id: number;
}

export interface UpdatePostDto {
  title: string;
  content: string;
  isPublished: boolean;
}
