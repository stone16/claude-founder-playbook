---
artifact: market-sizing
stage: idea
status: complete
updated: "2026-05-26T10:00:00.000Z"
evidence:
  - label: "https://www.gartner.com/en/newsroom/press-releases/2024-01-31-gartner-says-more-than-80-percent-of-enterprises-will-have-used-generative-ai-by-2026"
    claims: []
  - label: "https://survey.stackoverflow.co/2024/ai"
    claims: []
  - label: "https://www.marketsandmarkets.com/Market-Reports/ai-ml-tools-market.html"
    claims: []
---

# Market Sizing

## TAM (Total Addressable Market)

Global market for AI/ML developer tools and knowledge platforms. Estimated at 8.2 billion USD in 2025, growing at 32 percent CAGR. Sources: Gartner (overall AI software market), MarketsAndMarkets (AI/ML tools segment), Stack Overflow 2024 survey (practitioner count). Individual source links in frontmatter evidence. The 50 USD per seat assumption is a pricing hypothesis to be tested in discovery. This includes all developers working with AI/ML who need reference materials, tooling comparisons, and architecture guidance.

Bottom-up sanity check: approximately 3.2 million professional developers worldwide identify as AI/ML practitioners (Stack Overflow 2024 survey). At 50 USD per seat per month for premium knowledge tools, the theoretical ceiling is roughly 1.9 billion USD annually for paid subscriptions alone, not counting enterprise licensing.

## SAM (Serviceable Addressable Market)

The subset of AI/ML practitioners who are actively building or evaluating AI agents (not just using LLMs for completion or chat). Estimated at 15 to 25 percent of AI practitioners in 2025, or 480,000 to 800,000 developers globally. Applying the same 50 USD per seat per month yields a SAM of 288 to 480 million USD annually.

This is the segment that needs structured agent architecture knowledge specifically, not general AI/ML resources. Geographic focus: North America and Europe in year one, where agent adoption is concentrated.

## SOM (Serviceable Obtainable Market)

Conservative estimate: capture 2 to 5 percent of the SAM within 24 months, representing 9,600 to 40,000 paid seats. At 40 USD per seat per month (discounted from list to account for free tier and early-adopter pricing), this yields 4.6 to 19.2 million USD in annual recurring revenue.

The wide range reflects uncertainty in conversion from free to paid. Our baseline assumption is 3 percent SAM capture in 24 months, or approximately 15,000 seats and 7.2 million USD ARR. This assumes a freemium model where content access is free and premium features (comparator, decision trees, freshness alerts) are paid.

Key assumption to validate: willingness to pay for curated knowledge vs. expectation that technical reference content should be free (like MDN or Kubernetes docs).
