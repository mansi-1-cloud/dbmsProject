/**
 * A custom error class for handling specific HTTP status codes.
 * This lets the service layer (e.g., TokenService) tell the
 * router which status code to send.
 */
export class HttpError extends Error {
  public status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}
