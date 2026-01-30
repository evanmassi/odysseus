/**
 * Validation Middleware Tests
 *
 * Tests request validation, sanitization, and error formatting.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { validateBody, validateParams, validateQuery, sanitizeStrings } from './Validation';

// Mock logger
jest.mock('@utils/logger', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });

    mockRequest = {
      body: {},
      params: {},
      query: {},
      path: '/test',
      method: 'POST',
    };

    mockResponse = {
      status: statusMock,
      json: jsonMock,
    };

    mockNext = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateBody()', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().positive(),
    });

    it('should call next() for valid body', () => {
      mockRequest.body = { name: 'John', age: 25 };

      validateBody(testSchema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusMock).not.toHaveBeenCalled();
    });

    it('should replace body with parsed data', () => {
      mockRequest.body = { name: 'John', age: 25, extra: 'ignored' };

      validateBody(testSchema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body).toEqual({ name: 'John', age: 25 });
    });

    it('should return 400 for invalid body', () => {
      mockRequest.body = { name: '', age: -5 };

      validateBody(testSchema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should include validation errors in response', () => {
      mockRequest.body = { name: '' };

      validateBody(testSchema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Validation failed',
          details: expect.arrayContaining([
            expect.objectContaining({ field: expect.any(String) }),
          ]),
        })
      );
    });

    it('should handle missing required fields', () => {
      mockRequest.body = {};

      validateBody(testSchema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should handle schema parsing error gracefully', () => {
      const badSchema = {
        safeParse: () => {
          throw new Error('Schema error');
        },
      } as unknown as z.ZodSchema;

      validateBody(badSchema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Internal validation error',
        })
      );
    });
  });

  describe('validateParams()', () => {
    const paramsSchema = z.object({
      id: z.string().uuid(),
    });

    it('should call next() for valid params', () => {
      mockRequest.params = { id: '123e4567-e89b-12d3-a456-426614174000' };

      validateParams(paramsSchema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 400 for invalid params', () => {
      mockRequest.params = { id: 'not-a-uuid' };

      validateParams(paramsSchema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid parameters',
        })
      );
    });

    it('should handle missing params', () => {
      mockRequest.params = {};

      validateParams(paramsSchema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
    });
  });

  describe('validateQuery()', () => {
    const querySchema = z.object({
      page: z.coerce.number().positive().optional(),
      limit: z.coerce.number().positive().max(100).optional(),
    });

    it('should call next() for valid query', () => {
      mockRequest.query = { page: '1', limit: '10' };

      validateQuery(querySchema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 400 for invalid query', () => {
      mockRequest.query = { limit: '500' };

      validateQuery(querySchema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid query parameters',
        })
      );
    });

    it('should allow empty query with optional fields', () => {
      mockRequest.query = {};

      validateQuery(querySchema)(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('sanitizeStrings()', () => {
    it('should call next() after sanitization', () => {
      mockRequest.body = { name: 'Test' };

      sanitizeStrings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should remove script tags', () => {
      mockRequest.body = { content: '<script>alert("xss")</script>Hello' };

      sanitizeStrings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.content).toBe('Hello');
    });

    it('should remove HTML tags', () => {
      mockRequest.body = { content: '<div><p>Hello</p></div>' };

      sanitizeStrings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.content).toBe('Hello');
    });

    it('should trim whitespace', () => {
      mockRequest.body = { name: '  John Doe  ' };

      sanitizeStrings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.name).toBe('John Doe');
    });

    it('should handle nested objects', () => {
      mockRequest.body = {
        user: {
          name: '<script>bad</script>Good',
          profile: {
            bio: '<p>Bio text</p>',
          },
        },
      };

      sanitizeStrings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.user.name).toBe('Good');
      expect(mockRequest.body.user.profile.bio).toBe('Bio text');
    });

    it('should handle arrays', () => {
      mockRequest.body = {
        tags: ['<script>a</script>', '<div>b</div>', 'plain'],
      };

      sanitizeStrings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body.tags).toEqual(['', 'b', 'plain']);
    });

    it('should preserve non-string values', () => {
      mockRequest.body = { count: 42, active: true, data: null };

      sanitizeStrings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockRequest.body).toEqual({ count: 42, active: true, data: null });
    });

    it('should handle undefined body', () => {
      mockRequest.body = undefined;

      sanitizeStrings(mockRequest as Request, mockResponse as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});
