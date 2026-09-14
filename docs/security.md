# Security boundaries

- Every project read and write filters by the authenticated owner. Actor identity never comes from command JSON.
- Production login uses GitHub OAuth and signed NextAuth sessions. API changes require a same-origin request and schema validation.
- Development identity is available only outside production with an explicit flag and a loopback URL. Start the dev server with its supplied loopback binding; do not reverse-proxy it publicly.
- Imported project text is untrusted. The UI uses React text escaping; artifacts render as text, not injected HTML. AI has no tool execution, shell, URL fetching or approval privileges.
- AI credentials stay on the server. Users are told selected project content will be sent to the configured provider. This preview does not provide per-user provider keys, retention controls or billing isolation.
- API bodies enforce a 100,000-byte limit twice: an early `content-length` check when the header is present, then a second UTF-8 byte-count check after reading to catch missing or misleading headers. A production proxy must still enforce a byte/body limit before buffering. Add authenticated rate limits before public exposure, especially for AI requests.
- Session working notes require explicit saving. There is no autosave, collaborative editing or crash recovery for unsaved typing.
- Database backups, recovery drills, TLS, secret rotation, access logging and deployment monitoring belong to the host operator. The preview has not undergone a penetration test.
- GitHub OAuth and external AI behavior require configured-service integration testing; unit and local browser tests do not prove those services work.
