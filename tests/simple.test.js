// tests/simple.test.js - Simple test to verify Jest setup
import { describe, test, expect } from '@jest/globals';

describe('Simple Tests', () => {
  test('should verify Jest setup is working', () => {
    expect(1 + 1).toBe(2);
  });

  test('should test basic JavaScript functionality', () => {
    const obj = { name: 'test', value: 42 };
    expect(obj.name).toBe('test');
    expect(obj.value).toBe(42);
  });

  test('should test async functionality', async () => {
    const promise = Promise.resolve('success');
    const result = await promise;
    expect(result).toBe('success');
  });

  test('should test array operations', () => {
    const arr = [1, 2, 3, 4, 5];
    const doubled = arr.map(x => x * 2);
    expect(doubled).toEqual([2, 4, 6, 8, 10]);
  });

  test('should test function mocking', () => {
    const mockFn = jest.fn();
    mockFn('arg1', 'arg2');

    expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});