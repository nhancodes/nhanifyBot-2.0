# NhanifyBot Test Suite

This directory contains unit tests for the critical paths in the NhanifyBot codebase. The tests are built using [Vitest](https://vitest.dev/), a Vite-native testing framework.

## Test Structure

The tests are organized by functionality:

- `queue.test.ts` - Tests for the Queue management system
- `youtube.test.ts` - Tests for YouTube API integration
- `commands.test.ts` - Tests for command handling
- `webSocketServer.test.ts` - Tests for WebSocket server functionality
- `auth.test.ts` - Tests for Twitch authentication
- `nhanify.test.ts` - Tests for Nhanify API integration

## Running Tests

Run the tests using the following npm scripts:

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

## Test Coverage

The test coverage report will be generated in the `coverage` directory when running the `test:coverage` script. You can view the HTML coverage report by opening `coverage/index.html` in your browser.

## Mocking

The tests use Vitest's mocking capabilities to:

1. Mock external dependencies like WebSocket connections
2. Mock API responses for Twitch, YouTube, and Nhanify
3. Isolate and test specific functionality

## Adding Tests

When adding new functionality to the bot, please add corresponding tests. Follow these guidelines:

1. Write tests for both normal operation and error handling
2. Mock external dependencies to avoid actual API calls
3. Use descriptive test names that indicate what functionality is being tested
4. Keep tests focused on a single piece of functionality
5. Use beforeEach and afterEach for proper test setup and cleanup