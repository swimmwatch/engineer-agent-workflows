# Security Policy

## Supported versions

This project has not published a stable release. Security fixes are applied to
the current development branch on a best-effort basis. No released version is
currently supported.

After the first stable release, this table will identify the supported release
lines and their maintenance periods.

## Reporting a vulnerability

Do not report vulnerabilities in a public issue, discussion, pull request, or
other public channel.

Email `contact.vasiliev.dmitry@gmail.com` with:

- the affected version, tag, or commit when known;
- the impacted skill, script, manifest, or distribution path;
- steps to reproduce or a minimal proof of concept;
- the expected impact and relevant platform or client versions;
- any suggested mitigation.

Do not include credentials, private keys, access tokens, unrelated private
repository content, or personal data. If sensitive material is necessary,
request a safer exchange method before sending it.

Receipt and remediation are best effort; the project does not promise a
response or disclosure deadline. Please allow time to investigate before
publishing details.

## Security boundaries

The project distinguishes:

- the integrity of the pinned upstream npm package;
- the identity and signature of this project's Git source;
- checksums of generated release artifacts;
- the security and policy controls of Codex, Claude Code, GitHub, and other
  external services.

Do not assume that one of these controls verifies another.
