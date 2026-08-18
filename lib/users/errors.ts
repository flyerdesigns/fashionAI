export class UserRepositoryError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "UserRepositoryError";
  }
}
