// src/lib/contactModel.test.js
import { describe, it, expect } from 'vitest';
import { normalizeAddress, stripUndefinedDeep } from '@/lib/contactModel';

describe('contactModel', () => {
  describe('normalizeAddress', () => {
    it('should not include id field when not provided', () => {
      const result = normalizeAddress({ line1: '123 Main St' });
      expect(result).not.toHaveProperty('id');
      expect(result.line1).toBe('123 Main St');
    });

    it('should include id field when provided as valid string', () => {
      const result = normalizeAddress({ line1: '123 Main St', id: 'abc123' });
      expect(result.id).toBe('abc123');
    });

    it('should not include id field when empty string', () => {
      const result = normalizeAddress({ line1: '123 Main St', id: '' });
      expect(result).not.toHaveProperty('id');
    });

    it('should not include id field when whitespace only', () => {
      const result = normalizeAddress({ line1: '123 Main St', id: '   ' });
      expect(result).not.toHaveProperty('id');
    });

    it('should normalize all address fields', () => {
      const result = normalizeAddress({
        street: '456 Oak Ave',
        cityName: 'Providence',
        stateCode: 'RI',
        postalCode: '02903',
      });
      expect(result.line1).toBe('456 Oak Ave');
      expect(result.city).toBe('Providence');
      expect(result.state).toBe('RI');
      expect(result.zip).toBe('02903');
      expect(result).not.toHaveProperty('id');
    });
  });

  describe('stripUndefinedDeep', () => {
    it('should remove undefined values from flat object', () => {
      const input = { a: 1, b: undefined, c: 'hello' };
      const result = stripUndefinedDeep(input);
      expect(result).toEqual({ a: 1, c: 'hello' });
      expect(result).not.toHaveProperty('b');
    });

    it('should remove undefined values from nested objects', () => {
      const input = {
        name: 'John',
        address: {
          line1: '123 Main St',
          id: undefined,
          city: 'Providence',
        },
        contact: {
          email: 'john@example.com',
          phone: undefined,
        },
      };
      const result = stripUndefinedDeep(input);
      expect(result.address).not.toHaveProperty('id');
      expect(result.address.line1).toBe('123 Main St');
      expect(result.contact).not.toHaveProperty('phone');
      expect(result.contact.email).toBe('john@example.com');
    });

    it('should handle arrays', () => {
      const input = {
        items: [1, undefined, 3],
        nested: [{ a: 1, b: undefined }],
      };
      const result = stripUndefinedDeep(input);
      expect(result.items).toEqual([1, undefined, 3]); // Arrays keep undefined
      expect(result.nested[0]).toEqual({ a: 1 }); // But nested objects strip it
    });

    it('should handle null and preserve it', () => {
      const input = { a: null, b: undefined };
      const result = stripUndefinedDeep(input);
      expect(result.a).toBeNull();
      expect(result).not.toHaveProperty('b');
    });

    it('should not mutate original object', () => {
      const input = { a: 1, b: undefined };
      const result = stripUndefinedDeep(input);
      expect(input.b).toBeUndefined(); // Original unchanged
      expect(result).not.toHaveProperty('b'); // Result has it stripped
    });
  });

  describe('integration: normalizeAddress + stripUndefinedDeep', () => {
    it('should produce local data-safe address object', () => {
      const rawAddress = { line1: '123 Main St' };
      const normalized = normalizeAddress(rawAddress);
      const cleaned = stripUndefinedDeep({ address: normalized });
      
      // Should not have any undefined values
      const stringified = JSON.stringify(cleaned);
      expect(stringified).not.toContain('undefined');
      
      // Should have address.line1 but not address.id
      expect(cleaned.address.line1).toBe('123 Main St');
      expect(cleaned.address).not.toHaveProperty('id');
    });
  });
});
