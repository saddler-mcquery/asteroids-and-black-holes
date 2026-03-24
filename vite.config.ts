import { defineConfig } from 'vite';

export default defineConfig({
  base: '/asteroids-and-black-holes/',
  test: {
    globals: true,
    environment: 'node',
  },
});
