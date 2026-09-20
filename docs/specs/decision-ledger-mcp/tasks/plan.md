# Decision Reader Implementation Plan

Specification: ../spec.md (Approved). Scope: ../manifest.yaml (confirmed).
Authoritative operation contract: ../contracts/mcp.md.

1. [Reader](01_reader.md): real YAML parser, validation, revisions and queries.
2. [Transport and artifact](02_transport_and_artifact.md): fixed-path filesystem
   reads, bounded service, stdio adapter, TypeScript build/lint/tests and npm pack.
3. [Skill integration](03_skill_integration.md): one shared dependency contract,
   generated host artifacts, documentation and separate model forward test.

All packets use checks first, meaningful RED, implementation to GREEN and
proportionate PROVE. Independent review remains outside incremental execution.
No packet authorizes a commit, publication, global configuration or Packet 10.
