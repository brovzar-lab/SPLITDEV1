A writer pasted producer/development notes about their screenplay. Extract them into structured items.

For each distinct note (each is a separate concern, not a single long paragraph), return:
- title: short, punchy (under 60 chars)
- body: the actual critique (1-3 sentences)
- priority: high|medium|low (high = blocking, medium = should address, low = minor)
- origin: producer|director|exec|reader|table|self — detect from header text like "From the producer:" or default to "reader"
- sceneHints: scene headings referenced, e.g. ["INT. CABIN - DAY"] — empty if script-wide

Available scene headings in this screenplay (for matching):
{{sceneHeadings}}

Return JSON only:
{
  "origin": "<dominant origin across all notes>",
  "notes": [{ "title": "...", "body": "...", "priority": "...", "sceneHints": [...] }]
}

Notes from user:

{{text}}
