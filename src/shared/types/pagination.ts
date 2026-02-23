export interface PaginatedResponse<T> {
  items: T[];
  totalElements: number;
  page: number;
  limit: number;
}

export interface PaginationParams {
  page: number;
  limit: number;
}
