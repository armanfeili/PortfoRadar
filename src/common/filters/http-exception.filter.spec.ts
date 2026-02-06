import {
  HttpException,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(() => {
    filter = new HttpExceptionFilter();

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockRequest = {
      url: '/test-path',
    };

    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    };
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle NotFoundException', () => {
    const exception = new NotFoundException('Resource not found');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(404);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.statusCode).toBe(404);
    expect(body.message).toBe('Resource not found');
    expect(body.path).toBe('/test-path');
    expect(body.timestamp).toBeDefined();
  });

  it('should handle BadRequestException with array messages', () => {
    const exception = new BadRequestException([
      'field must be a string',
      'field2 must be a number',
    ]);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(400);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.statusCode).toBe(400);
    expect(body.message).toEqual([
      'field must be a string',
      'field2 must be a number',
    ]);
  });

  it('should handle generic HttpException', () => {
    const exception = new HttpException('Custom error', HttpStatus.FORBIDDEN);

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(403);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.statusCode).toBe(403);
    expect(body.message).toBe('Custom error');
  });

  it('should handle non-HttpException errors as 500', () => {
    const exception = new Error('Something unexpected');

    filter.catch(exception, mockHost);

    expect(mockResponse.status).toHaveBeenCalledWith(500);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    expect(body.message).toBe('Internal server error');
    expect(body.error).toBe('Internal Server Error');
  });

  it('should include path in error response', () => {
    mockRequest.url = '/companies?page=1';
    const exception = new NotFoundException('Not found');

    filter.catch(exception, mockHost);

    const body = mockResponse.json.mock.calls[0][0];
    expect(body.path).toBe('/companies?page=1');
  });

  it('should include ISO timestamp', () => {
    const exception = new NotFoundException('Not found');

    filter.catch(exception, mockHost);

    const body = mockResponse.json.mock.calls[0][0];
    expect(() => new Date(body.timestamp)).not.toThrow();
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});
