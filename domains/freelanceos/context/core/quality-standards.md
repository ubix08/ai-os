# Technical Writing Quality Standards
**Version: 1.0 | Last Updated: 2026-05-25**

## Scoring Framework (100 points)

### Content Quality (30 points)
- Answer-first: main point in first paragraph, stat in first sentence of each H2
- Actionable: every section has specific steps, examples, or code
- Depth: 1500-3000 words for technical articles, no fluff
- Structure: logical flow from problem → context → solution → next steps
- Code quality: all code blocks tested, commented, with language tags
- Originality: information gain — what does this add that top 5 results don't?

### SEO Structure (25 points)
- H1 → H2 → H3 hierarchy, no skipped levels
- Target keyword in H1, first 100 words, 2-3 H2s, meta description
- Semantic keywords naturally distributed (no stuffing)
- Internal linking: 3-5 relevant links with descriptive anchor text
- URL slug: hyphenated, lowercase, under 60 characters
- Meta description: 150-160 characters, includes keyword, compelling CTA

### E-E-A-T Signals (15 points)
- Experience: first-hand examples, case studies, screenshots
- Expertise: author bio, credentials, links to prior work
- Authority: citations from recognized sources, data backing claims
- Trust: date stamps, last-updated markers, transparent methodology

### Technical Accuracy (15 points)
- All statistics sourced with links and dates
- Code examples versioned (e.g., "Python 3.12+", "React 19")
- Tool/dependency versions specified
- Claims verifiable — no fabricated benchmarks or studies
- Warnings for deprecated features, breaking changes noted

### AI Citation Readiness (15 points)
- Key Takeaways box near top (bullet summary, 3-5 points)
- FAQ section with direct-answer format (question as H3, answer in 1-2 sentences)
- Definition blocks for technical terms (bold term, colon, concise definition)
- Structured data ready: tables, lists, numbered steps
- Citation tier: primary sources > official docs > reputable blogs > forums
- JSON-LD schema: Article schema required. FAQPage schema required if FAQ section exists.

## Pass Criteria
- Minimum 75/100 to publish
- Zero fabricated statistics
- All code blocks have language tags
- Answer-first formatting in every major section
- At least 3 sourced statistics
- FAQ schema included (JSON-LD FAQPage if FAQ section exists)
- Article schema included (JSON-LD Article)
- Named author — no generic placeholders ("Technical Writing Team", "AI Team", "Staff")
- Word count: 1500-3000 for technical articles
- External links: 3-5 unique domains, deduplicated

## Anti-Patterns (automatic deductions)
- Paragraphs over 150 words: -2 each
- Unsubstantiated claims: -5 each
- Skipped heading levels: -3 each
- Keyword stuffing (>3% density): -10
- No real images in 2000+ word article: -5. Placeholder comments do NOT count. Only markdown image tags count as real images.
- No last-updated date: -3
- Duplicate external links (same URL appearing multiple times): -2 per duplicate
- Missing JSON-LD Article schema: -5
- Missing JSON-LD FAQPage schema (when FAQ exists): -3
