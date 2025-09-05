### Testing — policy and patterns

Policy

- Tests must pass before/after changes. Write tests for new features.
- Co-locate tests in `__tests__` folders; use Jest + TypeScript.
- No test-only code in production files.

Commands

```bash
npm test
npm test --ci --runInBand
npm test --watch
npm test --coverage
```

Patterns

- Mock DB (`pg.Pool.query`) in unit tests.
- Test API routes with supertest.
- Component tests: render, assert visible behavior.
