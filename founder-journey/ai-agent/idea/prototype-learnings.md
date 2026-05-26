---
artifact: prototype-learnings
stage: idea
status: complete
updated: "2026-05-26T10:00:00.000Z"
evidence:
  - interview-synthesis.md
  - "https://www.figma.com"
---

# Prototype Learnings

## Prototype

A minimal knowledge base prototype was built over 2 weeks: a static site with 5 architecture pattern pages and a manual framework comparison table covering 12 frameworks. Shared with 8 interviewees from the initial discovery round for feedback. Not a working product, but a concrete artifact to elicit reactions.

## Observations

- **Comparison table was the most valued feature**: Seven of eight interviewees spent the most time on the comparison table. Three said they would bookmark it immediately. Two asked if they could contribute framework entries.
- **Pattern pages need decision context**: Interviewees skimmed the pattern descriptions but consistently asked "when would I use this pattern instead of that one?" The pattern library needs a decision-tree entry point, not just a catalog.
- **Trust signals matter more than we expected**: Four interviewees mentioned that the "last verified" date was the feature that made them trust the content. One said: "I would ignore this if it didn't show when it was last checked."
- **Free vs. paid line is blurry**: When asked what they would pay for, interviewees struggled to articulate a clear line. The comparison tool and freshness alerts were mentioned most often as paid features. Content access was expected to be free.
- **Framework maintainers want to participate**: Two interviewees who contribute to agent frameworks said they would want to ensure their framework is accurately represented. This suggests a self-service framework profile submission path.

## Next Experiment

Build a low-fidelity interactive decision tree (even a clickable Figma prototype) that walks practitioners from "I want to build X" to a recommended pattern and framework comparison. Test with 5 new interviewees to measure whether the decision-tree UX produces a stronger "I would use this" reaction than the static pattern catalog alone.

Success metric: 4 of 5 interviewees say they would return to use the decision tree for their next agent architecture decision, vs. the 3 of 8 who said they would return to the static prototype.
