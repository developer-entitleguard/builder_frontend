// Spring Data Page<T> shape — identical for every paginated endpoint.
export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}
