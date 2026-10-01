import { describe, it, expect } from 'vitest';
import { getTableColumns } from 'drizzle-orm';
import {
  user,
  session,
  account,
  verification,
  gameSessions,
} from '../schema.js';

describe('Drizzle Schemas', () => {
  it('should define user table with expected columns and primary key', () => {
    const columns = getTableColumns(user);
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('name');
    expect(columns).toHaveProperty('email');
    expect(columns).toHaveProperty('emailVerified');
    expect(columns).toHaveProperty('image');
    expect(columns).toHaveProperty('createdAt');
    expect(columns).toHaveProperty('updatedAt');

    expect(columns.id.primary).toBe(true);
    expect(columns.email.isUnique).toBe(true);
  });

  it('should define session table with token unique and foreign key to user', () => {
    const columns = getTableColumns(session);
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('token');
    expect(columns).toHaveProperty('userId');
    expect(columns).toHaveProperty('expiresAt');
    expect(columns).toHaveProperty('ipAddress');
    expect(columns).toHaveProperty('userAgent');

    expect(columns.id.primary).toBe(true);
    expect(columns.token.isUnique).toBe(true);
  });

  it('should define account table with credentials and provider info', () => {
    const columns = getTableColumns(account);
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('accountId');
    expect(columns).toHaveProperty('providerId');
    expect(columns).toHaveProperty('userId');
    expect(columns).toHaveProperty('password');
    expect(columns).toHaveProperty('createdAt');

    expect(columns.id.primary).toBe(true);
  });

  it('should define verification table for tokens and codes', () => {
    const columns = getTableColumns(verification);
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('identifier');
    expect(columns).toHaveProperty('value');
    expect(columns).toHaveProperty('expiresAt');

    expect(columns.id.primary).toBe(true);
  });

  it('should define game_sessions table with domain fields and default values', () => {
    const columns = getTableColumns(gameSessions);
    expect(columns).toHaveProperty('id');
    expect(columns).toHaveProperty('gameId');
    expect(columns).toHaveProperty('operatorId');
    expect(columns).toHaveProperty('status');
    expect(columns).toHaveProperty('title');
    expect(columns).toHaveProperty('config');
    expect(columns).toHaveProperty('startedAt');
    expect(columns).toHaveProperty('endedAt');
    expect(columns).toHaveProperty('createdAt');
    expect(columns).toHaveProperty('updatedAt');

    expect(columns.id.primary).toBe(true);
  });
});
