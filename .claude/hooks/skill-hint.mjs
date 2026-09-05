#!/usr/bin/env node
// UserPromptSubmit hook: inject a skill hint based on keywords so skills fire without being named.
const input = JSON.parse(await readStdin());
const p = String(input?.prompt ?? '').toLowerCase();
if (!p || p.startsWith('/')) process.exit(0);

const rules = [
  [/\b(screen|page|component|layout|redesign|ui|button|card|sheet|modal|dialog)\b/, 'expo-router, expo-design-system, frontend-design, apple-hig-designer, material-3'],
  [/\b(animation|animate|gesture|swipe|haptic|transition|bottom sheet)\b/, 'expo-animation'],
  [/\b(telugu|rtl|translate|translation|locale|i18n|font)\b/, '.claude/rules/i18n-rtl.md + @i18n-rtl-reviewer'],
  [/\b(slow|lag|jank|fps|performance|re-render|bundle size|memory)\b/, 'react-native-best-practices'],
  [/\b(test|spec|jest|maestro|e2e|coverage)\b/, 'superpowers:test-driven-development, react-native-testing, @test-writer'],
  [/\b(bug|broken|fails?|failing|error|crash|not working|unexpected)\b/, 'superpowers:systematic-debugging'],
  [/\b(plan|spec|design doc|architecture|decide|decision|approach)\b/, 'superpowers:brainstorming (then grilling / to-spec if decisions are open)'],
  [/\b(pr|pull request|merge|ship|release)\b/, 'design-audit → @design-critic → code-review → @pr-tracker'],
  [/\b(api|endpoint|fastapi|postgres|redis|docker|scheduler|worker|migration)\b/, '@backend-scaffolder + .claude/rules/api.md'],
  [/\b(eas|build|store|play store|app store|testflight)\b/, 'eas-workflows, eas-app-stores'],
  [/\b(tailwind|nativewind|class ?name)\b/, 'expo-tailwind-setup'],
];
const hits = rules.filter(([re]) => re.test(p)).map(([, s]) => s);
if (hits.length) {
  process.stdout.write(`[skill-hint] Matching skills for this request (invoke before acting): ${[...new Set(hits)].join(' | ')}\n`);
}

function readStdin() {
  return new Promise((res) => {
    let s = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => (s += c));
    process.stdin.on('end', () => res(s || '{}'));
    setTimeout(() => res(s || '{}'), 500);
  });
}
