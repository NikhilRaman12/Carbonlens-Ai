import '@testing-library/jest-dom';
import { beforeAll, vi } from 'vitest';

// Stub Recharts responsive container warning / dimensions at top level to avoid hoisting warning
vi.mock('recharts', async () => {
  const original = await vi.importActual<any>('recharts');
  const ReactMock = await import('react');
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: any }) =>
      ReactMock.default.createElement('div', { style: { width: 800, height: 400 } }, children),
  };
});

beforeAll(() => {
  // Stub standard window matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Stub standard window ResizeObserver
  class ResizeObserverMock {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: ResizeObserverMock,
  });
});
