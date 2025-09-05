### LLM Streaming — SSE wiring

Where

- `src/app/api/openai/route.ts`

Essentials

- Stream chunks immediately via `processor.sendText()`.
- Maintain `isThinking` UI state; show typing indicator and blinking cursor.
- Parse SSE safely and handle errors; reset state on completion/error.

UX markers

- Blue thinking background/border for active message.
- Accumulate content in a single message while streaming.
