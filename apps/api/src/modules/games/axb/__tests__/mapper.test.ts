import { describe, expect, it } from 'vitest';
import { AxBInputMapper } from '../mapper.js';
import { DEFAULT_AXB_CONFIG } from '../constants.js';
import type {
  CommentInteraction,
  GameInteraction,
  RecognizedGiftContribution,
} from '../../../../contracts/ingress.js';

describe('AxBInputMapper (TDD Red -> Green)', () => {
  const mapper = new AxBInputMapper();

  describe('RG-01: Comments to Votes', () => {
    it('maps single letter "A" (case-insensitive, trimmed) to VOTE command for Team A', () => {
      const interactionA: CommentInteraction = {
        id: 'ev-1',
        source: 'TIKTOK_LIVE',
        type: 'comment',
        userId: 'user-1',
        userName: 'Alice',
        comment: 'A',
        timestamp: 1000,
      };

      const resultA = mapper.mapInteraction(interactionA, DEFAULT_AXB_CONFIG);
      expect(resultA).toEqual({
        type: 'VOTE',
        team: 'A',
        userId: 'user-1',
        timestamp: 1000,
      });

      const interactionLowerA: CommentInteraction = {
        id: 'ev-2',
        source: 'TIKTOK_LIVE',
        type: 'comment',
        userId: 'user-2',
        userName: 'Bob',
        comment: '  a  ',
        timestamp: 1005,
      };

      const resultLowerA = mapper.mapInteraction(
        interactionLowerA,
        DEFAULT_AXB_CONFIG,
      );
      expect(resultLowerA).toEqual({
        type: 'VOTE',
        team: 'A',
        userId: 'user-2',
        timestamp: 1005,
      });
    });

    it('maps single letter "B" (case-insensitive, trimmed) to VOTE command for Team B', () => {
      const interactionB: CommentInteraction = {
        id: 'ev-3',
        source: 'TIKTOK_LIVE',
        type: 'comment',
        userId: 'user-3',
        userName: 'Charlie',
        comment: 'B',
        timestamp: 2000,
      };

      const resultB = mapper.mapInteraction(interactionB, DEFAULT_AXB_CONFIG);
      expect(resultB).toEqual({
        type: 'VOTE',
        team: 'B',
        userId: 'user-3',
        timestamp: 2000,
      });

      const interactionLowerB: CommentInteraction = {
        id: 'ev-4',
        source: 'TIKTOK_LIVE',
        type: 'comment',
        userId: 'user-4',
        userName: 'David',
        comment: '\n  b \t',
        timestamp: 2010,
      };

      const resultLowerB = mapper.mapInteraction(
        interactionLowerB,
        DEFAULT_AXB_CONFIG,
      );
      expect(resultLowerB).toEqual({
        type: 'VOTE',
        team: 'B',
        userId: 'user-4',
        timestamp: 2010,
      });
    });

    it('ignores invalid comments such as "time A", "AB", "AAAA", empty string or unrelated text', () => {
      const invalidTexts = [
        'time A',
        'AB',
        'AAAA',
        '',
        '   ',
        'C',
        'Voto no A',
        'b1',
      ];

      for (const text of invalidTexts) {
        const interaction: CommentInteraction = {
          id: `ev-invalid-${text}`,
          source: 'TIKTOK_LIVE',
          type: 'comment',
          userId: 'user-x',
          userName: 'Tester',
          comment: text,
          timestamp: 3000,
        };

        const result = mapper.mapInteraction(interaction, DEFAULT_AXB_CONFIG);
        expect(result).toBeNull();
      }
    });
  });

  describe('RG-04 & RG-07: Recognized gift contributions', () => {
    it('maps recognized units for a configured resource to points for its team', () => {
      const contribution: RecognizedGiftContribution = {
        id: 'contribution-1',
        source: 'TIKTOK_LIVE',
        type: 'gift_contribution',
        userId: 'donor-1',
        userName: 'SuperFan',
        resourceKey: 'tiktok:gift:5655',
        units: 3,
        timestamp: 4000,
      };

      const result = mapper.mapInteraction(contribution, DEFAULT_AXB_CONFIG);
      expect(result).toEqual({
        type: 'GIFT',
        team: 'A',
        pointsPerUnit: 10,
        resourceKey: 'tiktok:gift:5655',
        units: 3,
        timestamp: 4000,
      });
    });

    it('returns null for unmapped / unknown gifts (RG-07)', () => {
      const unknownContribution: RecognizedGiftContribution = {
        id: 'contribution-unknown',
        source: 'TIKTOK_LIVE',
        type: 'gift_contribution',
        userId: 'donor-99',
        userName: 'Anon',
        resourceKey: 'tiktok:gift:unmapped-9999',
        units: 1,
        timestamp: 5000,
      };

      const result = mapper.mapInteraction(
        unknownContribution,
        DEFAULT_AXB_CONFIG,
      );
      expect(result).toBeNull();
    });

    it('returns null for unsupported interaction types', () => {
      const unsupported = {
        id: 'ev-like-1',
        source: 'TIKTOK_LIVE',
        type: 'like',
        userId: 'donor-1',
        userName: 'Fan',
        timestamp: 6000,
      } as unknown as GameInteraction;

      const result = mapper.mapInteraction(unsupported, DEFAULT_AXB_CONFIG);
      expect(result).toBeNull();
    });
  });
});
