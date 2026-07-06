const normalizeSlug = (value) => String(value || '').trim().toLowerCase();

const getTextTokens = (value) =>
  String(value || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);

export function getRelatedToolsForTool(tool, availableTools = [], limit = 4) {
  if (!tool) return [];

  const currentId = tool.id;
  const currentSlug = normalizeSlug(tool.slug);
  const currentCategory = normalizeSlug(tool.category_id || tool.category_slug);
  const currentText = [tool.name, tool.description, tool.seo_keywords, tool.primary_keywords, tool.secondary_keywords, tool.slug]
    .filter(Boolean)
    .join(' ');
  const currentTokens = new Set(getTextTokens(currentText));

  const explicitIds = Array.isArray(tool.related_tool_ids)
    ? tool.related_tool_ids
        .map((id) => String(id || '').trim())
        .filter(Boolean)
    : [];

  const explicitMatches = [];
  const sameCategoryMatches = [];
  const seen = new Set([currentId, currentSlug]);

  for (const candidate of availableTools || []) {
    if (!candidate || candidate.id === currentId || normalizeSlug(candidate.slug) === currentSlug) continue;

    const candidateId = candidate.id ? String(candidate.id) : '';
    const candidateSlug = normalizeSlug(candidate.slug);
    if (seen.has(candidateId) || seen.has(candidateSlug)) continue;
    seen.add(candidateId || candidateSlug);

    const matchesExplicitId = explicitIds.includes(candidateId) || explicitIds.includes(candidateSlug);
    if (matchesExplicitId) {
      explicitMatches.push(candidate);
      continue;
    }

    const candidateCategory = normalizeSlug(candidate.category_id || candidate.category_slug);
    if (currentCategory && candidateCategory && candidateCategory === currentCategory) {
      const candidateText = [candidate.name, candidate.description, candidate.seo_keywords, candidate.primary_keywords, candidate.secondary_keywords, candidate.slug]
        .filter(Boolean)
        .join(' ');
      const tokenOverlap = getTextTokens(candidateText).filter((token) => currentTokens.has(token)).length;
      sameCategoryMatches.push({ candidate, tokenOverlap });
    }
  }

  if (explicitMatches.length > 0) {
    return explicitMatches.slice(0, limit);
  }

  const rankedSameCategory = sameCategoryMatches
    .sort((a, b) => b.tokenOverlap - a.tokenOverlap || String(a.candidate.name || '').localeCompare(String(b.candidate.name || '')))
    .map((entry) => entry.candidate);

  return rankedSameCategory.slice(0, limit);
}
