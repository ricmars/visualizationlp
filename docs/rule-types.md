### Rule Type Registry — essentials

Purpose

- Add rule types declaratively; generate validation, DB shape, and UI from a single definition.

Core files

- Registry: `src/app/types/ruleTypeRegistry.ts`
- Definitions: `src/app/types/ruleTypeDefinitions.ts`
- Dynamic DB: `src/app/lib/dynamicDatabaseService.ts`
- Dynamic API: `src/app/api/dynamic/route.ts`

Registering

```ts
import { ruleTypeRegistry } from "./ruleTypeRegistry";
import { myRuleType } from "./myRuleType";

ruleTypeRegistry.register(myRuleType);
```

Best practices

- Clear names; strict validation; versioning as needed.
- Keep TS interface names aligned with DB schema (snake_case columns).
