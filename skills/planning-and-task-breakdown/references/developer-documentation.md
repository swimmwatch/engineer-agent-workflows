# Conditional Developer Documentation

For every substantial plan, state whether durable developer documentation is
warranted and why. Create a separate final documentation packet when two or
more of these signals apply:

- the behavior crosses at least three layers or processes;
- a non-obvious rule would be expensive to rediscover;
- a constraint is likely to look like a defect unless explained;
- an operator or another team can misconfigure the capability silently;
- the work introduces vocabulary that the repository does not already define.

Do not create a durable document merely because a workflow asks for one. A
localized bug fix, rename, dependency update, configuration default, or thin
new endpoint over an established service normally does not warrant a separate
document. State the decision either way; silence is not a decision.

## Ownership And Order

Extend the nearest authoritative document when it already owns the capability.
Otherwise use the repository's established documentation location and naming
convention. Schedule a new developer-documentation packet after the behavior is
implemented and its end-to-end verification has completed, so the document
describes what exists rather than an early design.

Follow applicable repository guidance for the document language. If guidance
does not select a language, follow the established language of neighboring
authoritative documentation; do not impose the skill author's locale.

## Content

Keep the document concise and durable:

1. the problem and supported outcome;
2. the runtime flow in the order it occurs;
3. a small diagram only when interaction is harder to understand in prose;
4. constraints, fallbacks, and easy-to-misread behavior;
5. a few stable entry-point symbols a reader can search for.

Describe observable behavior rather than duplicating a specification, task
history, file inventory, or transient call graph. Avoid filler and unstable line
numbers in the final document.

The packet needs objective acceptance like any other packet. Verify it with a
reader who did not write the feature: that reader must be able to answer the
questions the document claims to explain and validate any commands or examples.
