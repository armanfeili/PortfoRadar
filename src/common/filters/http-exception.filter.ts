import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Standardized error response format for API consistency.
 * Ensures all errors follow the same structure regardless of source.
 */
export interface ErrorResponse {
  /** HTTP status code */
  statusCode: number;

  /** Machine-readable error code */
  error: string;

  /** Human-readable error message(s) */
  message: string | string[];

  /** Request path that triggered the error */
  path: string;

  /** ISO timestamp of when the error occurred */
  timestamp: string;
}

/**
 * Global HTTP exception filter that standardizes all error responses.
 *
 * Response format:
 * ```json
 * {
 *   "statusCode": 404,
 *   "error": "Not Found",
 *   "message": "Company with id 'abc123' not found",
 *   "path": "/companies/abc123",
 *   "timestamp": "2026-02-06T10:30:00.000Z"
 * }
 * ```
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();

    // Get the exception response (could be string or object)
    const exceptionResponse = exception.getResponse();

    // Extract message - handle both string and object formats
    let message: string | string[];
    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const responseObj = exceptionResponse as Record<string, unknown>;
      message = (responseObj.message as string | string[]) || exception.message;
    } else {
      message = exception.message;
    }

    // Build standardized error response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      error: this.getErrorName(status),
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }

  /**
   * Maps HTTP status codes to human-readable error names.
   */
  private getErrorName(status: number): string {
    const errorNames: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.METHOD_NOT_ALLOWED]: 'Method Not Allowed',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.TOO_MANY_REQUESTS]: 'Too Many Requests',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
      [HttpStatus.BAD_GATEWAY]: 'Bad Gateway',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
    };

    return errorNames[status] || 'Error';
  }
}
