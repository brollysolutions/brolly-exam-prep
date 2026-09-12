"""Import Constable 02 from its bilingual DOCX, retaining Word maths and provenance."""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'packages/fixtures/scripts'))
from import_si_mock import read_doc

TEST_ID = 'pc-constable-02'
EXPECTED = set(range(1, 201))
SECTIONS = (('english', 25), ('arithmetic', 35), ('reasoning', 40), ('gs', 100))


def split_paper(blocks, expected):
    bank, current = {}, None
    for block in blocks:
        match = re.match(r'^Q(\d{3})\.\s*(.*)$', block)
        if match:
            current = int(match[1])
            assert current not in bank, ('Duplicate question', current)
            bank[current] = [match[2]] if match[2] else []
        elif current is not None and block:
            bank[current].append(block)
    assert set(bank) == expected, ('Missing/extra questions', sorted(expected ^ set(bank)))
    if 20 in bank:
        start = next(i for i, line in enumerate(bank[20]) if line.startswith('Directions (Q021'))
        passage = bank[20][start:]
        assert len(passage) == 2 and "Rule of Law" in passage[1]
        bank[20] = bank[20][:start]
        for number in range(21, 26):
            bank[number] = passage + bank[number]
    parsed = {}
    for number, lines in bank.items():
        indexes = [i for i, line in enumerate(lines) if re.match(r'^[ABCD]\)\s*', line)]
        assert len(indexes) == 4 and [lines[i][0] for i in indexes] == list('ABCD'), number
        assert indexes == list(range(indexes[0], indexes[0] + 4)), (number, 'Split option')
        trailing = lines[indexes[-1] + 1:]
        if trailing:
            assert number in (25, 60, 100) and len(trailing) == 1, (number, trailing)
            assert re.match(r'^(Arithmetic|Reasoning|PART B|అర్థమెటిక్|రీజనింగ్|పార్ట్ B)', trailing[0]), trailing
        stem = '\n'.join(lines[:indexes[0]])
        options = [re.sub(r'^[ABCD]\)\s*', '', lines[i]) for i in indexes]
        assert stem and all(options), number
        assert not re.search(r'Correct Answer|Answer:|Explanation|వివరణ', stem + '\n'.join(options)), (number, 'Solution leak')
        parsed[number] = (stem, options)
    return parsed


def parse(path):
    blocks, _, media = read_doc(path)
    assert not media, 'Embedded images need extraction before import'
    a = next(i for i, block in enumerate(blocks) if block.startswith('SECTION A'))
    b = next(i for i, block in enumerate(blocks) if block.startswith('SECTION B'))
    k = next(i for i, block in enumerate(blocks) if block.startswith('COMMON ANSWER KEY'))
    s = next(i for i in range(k + 1, len(blocks)) if re.fullmatch(r'Q001\s*[—–-]\s*Answer:\s*[ABCD]', blocks[i]))
    assert any('200 Multiple Choice' in block for block in blocks[:a])
    assert any('180 Minutes' in block for block in blocks[:a])
    english = split_paper(blocks[a + 1:b], EXPECTED)
    telugu = split_paper(blocks[b + 1:k], set(range(26, 201)))
    # The source explicitly refers Telugu readers to the English Q001-Q025.
    assert 'Q001' in blocks[b + 1] and 'Q025' in blocks[b + 1] and 'సెక్షన్ A' in blocks[b + 1]
    telugu.update({number: english[number] for number in range(1, 26)})
    papers = {'en': english, 'te': telugu}
    table_keys = {}
    for table in blocks[k + 1:s]:
        rows = table.splitlines()
        if not rows or not rows[0].startswith('Q.No'):
            continue
        for row in rows[1:]:
            cells = [cell.strip() for cell in row.split('|')]
            assert len(cells) == 10, row
            for number, key in zip(cells[::2], cells[1::2]):
                number = int(number)
                assert number not in table_keys and key in list('ABCD'), (number, key)
                table_keys[number] = key
    assert set(table_keys) == EXPECTED, 'Expected 200 summary keys'
    solutions, current = {}, None
    for block in blocks[s:]:
        match = re.fullmatch(r'Q(\d{3})\s*[—–-]\s*Answer:\s*([ABCD])', block)
        if match:
            current = int(match[1])
            assert current not in solutions, ('Duplicate solution', current)
            solutions[current] = {'key': match[2], 'en': [], 'te': []}
        elif current is not None and block:
            clean = re.sub(r'^•\s*', '', block)
            if clean.startswith('English Explanation:'):
                solutions[current]['en'].append(clean.removeprefix('English Explanation:').strip())
            elif clean.startswith('తెలుగు వివరణ:'):
                solutions[current]['te'].append(clean.removeprefix('తెలుగు వివరణ:').strip())
            else:
                assert re.match(r'^(Arithmetic|Reasoning|PART B).*Q\d{3}', clean), (current, 'Unconsumed solution text', block)
    assert set(solutions) == EXPECTED, 'Expected 200 bilingual solutions'
    bank, conflicts = [], []
    for number in range(1, 201):
        solution = solutions[number]
        assert solution['en'] and solution['te'], (number, 'Missing bilingual explanation')
        if table_keys[number] != solution['key']:
            conflicts.append({'question': number, 'tableKey': table_keys[number], 'solutionKey': solution['key']})
        section = next(section for section, last in (('english', 25), ('arithmetic', 60), ('reasoning', 100), ('gs', 200)) if number <= last)
        bank.append({
            'id': f'{TEST_ID}-{section}-{number:03}', 'section': section,
            'text': {lang: paper[number][0] for lang, paper in papers.items()},
            'options': {lang: paper[number][1] for lang, paper in papers.items()},
            'correct': 'ABCD'.index(solution['key']),
            'explanation': {lang: '\n'.join(solution[lang]) for lang in ('en', 'te')},
            'avgSeconds': 0,
        })
    assert Counter(q['section'] for q in bank) == dict(SECTIONS)
    review = json.loads(Path(__file__).with_name('constable_mock_02_review.json').read_text('utf-8'))
    source_hash = hashlib.sha256(path.read_bytes()).hexdigest()
    assert source_hash == review['sourceSha256'], 'Source changed: review corrections before importing a new revision'
    corrections = review['keyCorrections']
    assert len({row['question'] for row in corrections}) == len(corrections)
    for row in corrections:
        assert row['question'] in EXPECTED and row['key'] in list('ABCD')
        question = bank[row['question'] - 1]
        assert question['correct'] != 'ABCD'.index(row['key']), ('Stale correction', row)
        row['sourceSolutionKey'] = 'ABCD'[question['correct']]
        question['correct'] = 'ABCD'.index(row['key'])
    report = {
        'file': path.name, 'sha256': source_hash,
        'testId': TEST_ID, 'questions': len(bank), 'durationMinutes': 180,
        'sourceHeading': blocks[3], 'titlePolicy': 'Use Constable Mock Test 02 as requested; source heading says Test 01.',
        'sections': dict(SECTIONS), 'tableKeys': len(table_keys), 'solutions': len(solutions),
        'englishQuestionsReusedInTelugu': list(range(1, 26)),
        'sharedPassageQuestions': list(range(21, 26)),
        'answerPolicy': 'Correct unambiguous option-letter mismatches using the source explanation. Otherwise retain detailed solution letters, flagging unresolved source issues. Question/option/explanation wording is preserved.',
        'keyConflicts': conflicts,
        'keyCorrections': corrections,
        'reviewFlags': review['reviewFlags'],
        'answerDistribution': dict(Counter('ABCD'[q['correct']] for q in bank)),
    }
    return bank, report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    bank, report = parse(args.source)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        "// Generated by scripts/import_constable_mock_02.py from BrollyExamPrep constable 2.docx.\n"
        "// Source provenance and key discrepancies: docs/constable-mock-02.sources.json.\n"
        "import type { Question } from '@tslprb/fixtures';\n\n"
        'export const CONSTABLE_MOCK_02_QUESTIONS: Question[] = '
        + json.dumps(bank, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Imported {len(bank)} bilingual questions, {len(report['keyConflicts'])} source key conflicts")


if __name__ == '__main__':
    main()
