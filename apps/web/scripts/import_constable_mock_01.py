"""Import the supplied full Constable paper, separating questions and solutions."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'packages/fixtures/scripts'))
from import_si_mock import read_doc

TEST_ID = 'pc-constable-01'
SECTIONS = (('english', 25), ('arithmetic', 35), ('reasoning', 40), ('gs', 100))


def split_paper(blocks):
    bank, current = {}, None
    for block in blocks:
        match = re.match(r'^Q(\d{3})\.\s*(.*)$', block)
        if match:
            current = int(match[1])
            assert current not in bank, ('Duplicate question', current)
            bank[current] = [match[2]] if match[2] else []
        elif current is not None and block:
            bank[current].append(block)
    assert set(bank) == set(range(1, 201)), 'Expected Q001-Q200 in each language'
    # Word places the shared reading passage after Q020, before Q021-Q025.
    start = next(i for i, line in enumerate(bank[20]) if line.startswith('Direction (Q021'))
    passage = bank[20][start:]
    assert len(passage) == 2 and 'community policing' in passage[1]
    bank[20] = bank[20][:start]
    for n in range(21, 26):
        bank[n] = passage + bank[n]
    parsed = {}
    for n, lines in bank.items():
        indexes = [i for i, line in enumerate(lines) if re.match(r'^[ABCD]\)\s*', line)]
        assert len(indexes) == 4 and [lines[i][0] for i in indexes] == list('ABCD'), n
        assert indexes == list(range(indexes[0], indexes[0] + 4)), (n, 'Split option')
        trailing = lines[indexes[-1] + 1:]
        if trailing:
            assert n in (25, 60, 100) and len(trailing) == 1, (n, trailing)
            assert re.match(r'^(Arithmetic|Reasoning|PART B|అర్థమెటిక్|రీజనింగ్|పార్ట్ B)', trailing[0]), trailing
        stem = '\n'.join(lines[:indexes[0]])
        options = [re.sub(r'^[ABCD]\)\s*', '', lines[i]) for i in indexes]
        assert stem and all(options), n
        assert not re.search(r'Correct Answer|Correct Option|Explanation|వివరణ', stem + '\n'.join(options)), (n, 'Solution leak')
        parsed[n] = (stem, options)
    return parsed


def parse(path):
    blocks, _, media = read_doc(path)
    assert not media, 'Embedded media needs extraction before import'
    a = next(i for i, b in enumerate(blocks) if b.startswith('SECTION A'))
    b = next(i for i, b in enumerate(blocks) if b.startswith('SECTION B'))
    k = next(i for i, b in enumerate(blocks) if b.startswith('ANSWER KEY (Q001'))
    s = next(i for i, b in enumerate(blocks) if 'FULL BILINGUAL SOLUTIONS (Q001' in b)
    assert any('200 Multiple Choice' in b for b in blocks[:a])
    assert any('180 Minutes' in b for b in blocks[:a])
    papers = {'en': split_paper(blocks[a + 1:b]), 'te': split_paper(blocks[b + 1:k])}
    solutions, current = {}, None
    for block in blocks[s + 1:]:
        match = re.fullmatch(r'Q(\d{3})\s*[—–-]\s*Solution', block)
        if match:
            current = int(match[1])
            assert current not in solutions, ('Duplicate solution', current)
            solutions[current] = []
        elif current is not None and block:
            if re.match(r'^(Arithmetic|Reasoning & Mental Ability|PART B).*Q\d{3}', block):
                continue
            solutions[current].append(block)
    assert set(solutions) == set(range(1, 201)), 'Expected 200 solutions'
    table_keys, repeated = {}, []
    for table in blocks[k + 1:s]:
        rows = table.splitlines()
        if not rows or not rows[0].startswith('Q.No'):
            continue
        for row in rows[1:]:
            cells = [c.strip() for c in row.split('|')]
            assert len(cells) == 10, row
            for n, key in zip(cells[::2], cells[1::2]):
                n = int(n)
                assert key in 'ABCD' and len(key) == 1
                if n in table_keys:
                    assert table_keys[n] == key, (n, 'Conflicting duplicate table keys')
                    repeated.append(n)
                table_keys[n] = key
    bank, conflicts, flags = [], [], []
    for n in range(1, 201):
        lines = solutions[n]
        keys = re.findall(r'Correct Answer:\s*([ABCD])\b', '\n'.join(lines))
        assert len(keys) == 1, (n, 'No unambiguous detailed-solution key')
        key = keys[0]
        if n in table_keys and table_keys[n] != key:
            conflicts.append({'question': n, 'tableKey': table_keys[n], 'solutionKey': key, 'used': key})
        explanation, language = {'en': [], 'te': []}, 'en'
        for line in lines:
            clean = re.sub(r'^•\s*', '', line)
            if re.match(r'^[\u0c00-\u0c7f]', clean):
                language = 'te'
            elif clean.startswith(('Correct Answer', 'English Explanation', 'Why Other', 'Exam Tip')):
                language = 'en'
            explanation[language].append(line)
        assert explanation['en'] and explanation['te'], (n, 'Missing bilingual explanation')
        if re.search(r'\bwait\b|inconsisten|no correct|no valid|mismatch|discrepanc|correction of', '\n'.join(lines), re.I):
            flags.append({'question': n, 'issue': 'Source explanation contains an unresolved calculation or consistency issue; preserved verbatim.'})
        section = next(section for section, last in (('english', 25), ('arithmetic', 60), ('reasoning', 100), ('gs', 200)) if n <= last)
        bank.append({'id': f'{TEST_ID}-{section}-{n:03}', 'section': section,
                     'text': {lang: paper[n][0] for lang, paper in papers.items()},
                     'options': {lang: paper[n][1] for lang, paper in papers.items()},
                     'correct': 'ABCD'.index(key),
                     'explanation': {lang: '\n'.join(value) for lang, value in explanation.items()},
                     'avgSeconds': 0})
    assert Counter(q['section'] for q in bank) == dict(SECTIONS)
    assert all(q['text']['en'] == q['text']['te'] and q['options']['en'] == q['options']['te'] for q in bank[:25])
    return bank, {'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
                  'testId': TEST_ID, 'questions': len(bank), 'durationMinutes': 180,
                  'sections': dict(SECTIONS), 'tableKeys': len(table_keys), 'solutions': len(solutions),
                  'answerPolicy': 'Use each detailed solution explicit Correct Answer; preserve source text without editorial corrections.',
                  'keysRecoveredFromExplicitSolution': sorted(set(range(1, 201)) - set(table_keys)),
                  'duplicateTableKeys': repeated, 'keyConflicts': conflicts, 'reviewFlags': flags,
                  'answerDistribution': dict(Counter('ABCD'[q['correct']] for q in bank)),
                  'sharedPassageQuestions': list(range(21, 26))}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    bank, report = parse(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        "// Generated by scripts/import_constable_mock_01.py from BrollyExamPrep constable 1.docx.\n"
        "// Source-authored questions/solutions; discrepancies recorded in docs/constable-mock-01.sources.json.\n"
        "import type { Question } from '@tslprb/fixtures';\n\n"
        'export const CONSTABLE_MOCK_01_QUESTIONS: Question[] = '
        + json.dumps(bank, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
