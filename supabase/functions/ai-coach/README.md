# Finance Coach AI Edge Function

Provider: Groq API

Default model:

`openai/gpt-oss-20b`

The model can be changed with the server-side `GROQ_MODEL` secret, but the configured model must support the JSON-schema mode used by this function.

## Local secret

Copy:

`supabase/functions/.env.example`

to:

`supabase/functions/.env`

Then put the real `GROQ_API_KEY` in that local file.

The real file is gitignored.

## Hosted secret

Set `GROQ_API_KEY` and optionally `GROQ_MODEL` as Supabase Edge Function secrets in staging/production.

Never put the Groq API key into an `EXPO_PUBLIC_*` variable, the mobile bundle, SecureStore, or client-side source code.

## Security flow

1. Supabase validates the user request.
2. The function validates the authenticated user.
3. PostgreSQL produces the trusted summarized context under the user's identity/RLS.
4. The Edge Function adds deterministic currency formatting.
5. Only the summarized context is sent to Groq.
6. Groq returns strict structured JSON.
7. The Edge Function validates the response.
8. Only the server-side function writes assistant messages and generated insights.
9. The function exposes no tools capable of changing financial records.