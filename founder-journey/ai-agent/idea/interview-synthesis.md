---
artifact: interview-synthesis
stage: idea
status: complete
updated: "2026-05-26T10:00:00.000Z"
evidence:
  - "https://www.gartner.com/en/newsroom/press-releases/2024-01-31-gartner-says-more-than-80-percent-of-enterprises-will-have-used-generative-ai-by-2026"
  - "https://survey.stackoverflow.co/2024/ai"
---

# Interview Synthesis

Twelve interviews conducted with AI engineers and engineering managers across six companies (Series A to post-IPO). Five interviewees were currently building agents in production; seven were evaluating whether to start.

## Pain Points

- **Research tax is real**: Ten of twelve interviewees spontaneously described spending "hours on X" or "days researching" before making a framework decision. The median estimate was 2-3 weeks of research before first production commit.
- **Fear of churn**: Eight interviewees mentioned anxiety about picking a framework that might be abandoned or superseded within months. Three had already migrated between frameworks (LangChain to CrewAI, AutoGen to raw SDK) and described the cost as "essentially a rewrite."
- **Missing operations knowledge**: Nine interviewees said the hardest information to find was not how to build an agent but how to run one: observability, cost control, prompt regression testing, and guardrail effectiveness.
- **Vendor distrust is widespread**: Eleven of twelve said they discount vendor-provided comparisons. The most common reason: "They optimize benchmarks for their own library."

## Buying Signal

- Eight interviewees said they would pay $20-50 per seat per month for a tool that saves their team 5+ hours per month of research time.
- Four interviewees had already built internal "agent decision" docs and expressed frustration that every team was reinventing this.
- Three interviewees offered to contribute case studies unprompted during the interview.
- The strongest willingness-to-pay signal came from teams with 5-20 engineers actively working on agents.

## Surprises

- **Not documentation, navigation**: The most painful gap was not missing documentation but missing navigation. Interviewees knew the docs existed; they could not efficiently find which doc applied to their situation.
- **Patterns over frameworks**: Six interviewees said they care more about understanding architecture patterns than comparing specific frameworks. "Once I understand the pattern, the framework choice becomes obvious."
- **Trust comes from negative signal**: Seven interviewees said they trust content more when it documents failure modes and limitations honestly. Pure endorsement content is treated as marketing regardless of source.
