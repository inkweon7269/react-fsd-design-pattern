export interface PaginatedResponse<T> {
  items: T[];
  totalElements: number;
  page: number;
  limit: number;
}
