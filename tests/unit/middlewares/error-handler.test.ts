import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Response } from 'express';

import { errorHandlerMiddleware } from '../../../src/middlewares/error-handler.middleware';
import { NotFoundError } from '../../../src/shared/errors';

function mockResponse(): Response {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('errorHandlerMiddleware', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses the status/code/message of a known AppError', () => {
    const res = mockResponse();

    errorHandlerMiddleware(new NotFoundError('Wallet not found', 'WALLET_NOT_FOUND'), {} as never, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Wallet not found', code: 'WALLET_NOT_FOUND' });
  });

  it('falls back to a generic 500 for an error that is not an AppError', () => {
    const res = mockResponse();

    errorHandlerMiddleware(new Error('something exploded'), {} as never, res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Internal server error', code: 'INTERNAL_ERROR' });
  });

  it('logs the unexpected error instead of swallowing it silently', () => {
    const res = mockResponse();
    const error = new Error('something exploded');

    errorHandlerMiddleware(error, {} as never, res, vi.fn());

    expect(console.error).toHaveBeenCalledWith(error);
  });
});
