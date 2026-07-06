import test from 'node:test';
import assert from 'node:assert/strict';
import { getRelatedToolsForTool } from './relatedTools.js';

test('prefers explicit related tool ids before same-category fallbacks', () => {
  const currentTool = {
    id: 'tool-a',
    slug: 'tool-a',
    category_id: 'finance',
    category_slug: 'finance',
    related_tool_ids: ['tool-b', 'tool-c'],
  };

  const tools = [
    { id: 'tool-a', slug: 'tool-a', category_id: 'finance', category_slug: 'finance' },
    { id: 'tool-b', slug: 'tool-b', category_id: 'finance', category_slug: 'finance', name: 'Tool B', description: 'Loan calculator' },
    { id: 'tool-c', slug: 'tool-c', category_id: 'finance', category_slug: 'finance', name: 'Tool C', description: 'Investment planner' },
    { id: 'tool-d', slug: 'tool-d', category_id: 'finance', category_slug: 'finance', name: 'Tool D', description: 'Budget planner' },
    { id: 'tool-e', slug: 'tool-e', category_id: 'image-tools', category_slug: 'image-tools', name: 'Tool E', description: 'Image editor' },
  ];

  const related = getRelatedToolsForTool(currentTool, tools, 4);
  assert.deepEqual(related.map((tool) => tool.slug), ['tool-b', 'tool-c']);
});

test('falls back to same-category tools when no explicit relations exist', () => {
  const currentTool = {
    id: 'tool-a',
    slug: 'tool-a',
    category_id: 'finance',
    category_slug: 'finance',
  };

  const tools = [
    { id: 'tool-a', slug: 'tool-a', category_id: 'finance', category_slug: 'finance' },
    { id: 'tool-b', slug: 'tool-b', category_id: 'finance', category_slug: 'finance', name: 'EMI Calculator', description: 'Loan EMI calculator', seo_keywords: 'emi loan calculator' },
    { id: 'tool-c', slug: 'tool-c', category_id: 'finance', category_slug: 'finance', name: 'SIP Planner', description: 'Investment planner', seo_keywords: 'invest sip calculator' },
    { id: 'tool-d', slug: 'tool-d', category_id: 'image-tools', category_slug: 'image-tools', name: 'Image Resizer', description: 'Resize images' },
  ];

  const related = getRelatedToolsForTool(currentTool, tools, 4);
  assert.deepEqual(related.map((tool) => tool.slug), ['tool-b', 'tool-c']);
});
