# SEO & GEO (Generative Engine Optimization)

## On-Page SEO Checklist
- [ ] Target keyword in H1, first 100 words, 2-3 H2s, and meta description
- [ ] H1 → H2 → H3 hierarchy, no skipped levels
- [ ] URL slug: hyphenated, lowercase, under 60 characters
- [ ] Meta description: 150-160 characters, includes keyword, compelling CTA
- [ ] Internal links: 3-5 with descriptive anchor text
- [ ] External links: 3-5 unique authoritative domains
- [ ] Semantic keywords naturally distributed (no stuffing)
- [ ] Image alt text with keywords where natural
- [ ] Open Graph and Twitter Card meta tags
- [ ] Canonical URL
- [ ] Mobile-friendly formatting (short paragraphs, responsive tables)
- [ ] Page speed: minimize heavy embeds, lazy-load images

## AI Citation Optimization (GEO/AEO)

### Key Takeaways
Bullet summary at the top of the article (3-5 points). This is the first thing AI extractors read.

### FAQ with Direct-Answer Format
- Each question as an H3
- Answer in 1-2 sentences
- Include the target keyword naturally in the answer
- FAQ should cover the most common search intents

### Definition Blocks
Format: `**Term**: Concise definition (1-2 sentences).`
Place at first mention of technical terms.
Helps AI extractors build knowledge graphs.

### Citation Tiers
1. Primary sources (official docs, standards bodies, academic papers)
2. Official documentation and repositories
3. Reputable technical blogs and tutorials
4. Community forums and Stack Overflow (use sparingly)

### Structured Content
- Tables for comparative data
- Ordered lists for sequential steps
- Unordered lists for features and bullet points
- Code blocks with language tags

### Information Gain
Each section should answer: "What does this add that top 5 search results don't?"
Original insights, unique examples, and practical experience differentiate AI-cited content.

## JSON-LD Schema

### Article Schema (Required)
```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Title",
  "description": "Meta description",
  "datePublished": "YYYY-MM-DD",
  "dateModified": "YYYY-MM-DD",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  }
}
```

### FAQPage Schema (Required if FAQ exists)
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Question?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Answer text."
    }
  }]
}
```
