export interface Post {
  id: number;
  title: string;
  content: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GetPostsParams {
  page?: number;
  limit?: number;
  isPublished?: boolean;
}
