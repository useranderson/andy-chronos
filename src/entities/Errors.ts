export class InternalError extends Error {
  constructor(public originalError: unknown) {
    // Se originalError for um erro válido, usa sua mensagem; caso contrário, usa um fallback genérico
    const message =
      originalError instanceof Error
        ? originalError.message
        : String(originalError);

    super(message);
    this.name = "InternalError";

    // Se o erro original tiver uma stack, reutiliza ela
    if (originalError instanceof Error && originalError.stack) {
      this.stack = originalError.stack;
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InternalError);
    }
  }
}

export class FailExecution extends Error {
  constructor(public originalError: unknown) {
    // Se originalError for um erro válido, usa sua mensagem; caso contrário, usa um fallback genérico
    const message =
      originalError instanceof Error
        ? originalError.message
        : String(originalError);

    super(message);
    this.name = "FailtExecution";

    // Se o erro original tiver uma stack, reutiliza ela
    if (originalError instanceof Error && originalError.stack) {
      this.stack = originalError.stack;
    } else if (Error.captureStackTrace) {
      Error.captureStackTrace(this, InternalError);
    }
  }
}
