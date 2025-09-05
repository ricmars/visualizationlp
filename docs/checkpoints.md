### Checkpoints — single source of truth

- All POST/PUT/DELETE at `/api/database` and dynamic API are checkpointed automatically.
- LLM sessions can group related actions; UI/MCP create one checkpoint per operation.
- Rollbacks apply inverse operations in reverse order within a transaction.

What gets stored

- `checkpoints` (id, description, status, timestamps)
- `undo_log` (checkpoint_id, operation, table_name, primary_key, previous_data)

Guidelines

- Do not bypass checkpointed endpoints.
- On failure during grouped LLM tools, roll back.
- Committed checkpoints clean up undo logs; index on `checkpoint_id`, `created_at`.

Verification

- Use checkpoint history API to inspect changes, and ensure referential integrity on restore.
