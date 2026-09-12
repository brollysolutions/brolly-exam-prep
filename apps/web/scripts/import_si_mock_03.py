"""Combine the three supplied SI Series III DOCX papers without leaking solutions."""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys
from zipfile import ZipFile

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'packages/fixtures/scripts'))
from import_si_mock import read_doc

TEST_ID = 'si-brolly-03'


def split_paper(blocks, expected):
    bank, current = {}, None
    for block in blocks:
        # The edited reasoning Q021 has neither a period nor a space in English.
        match = re.match(r'^Q(\d{3})(?:\.\s*|\s+|(?=Which\b))(.*)$', block, re.S)
        if match:
            current = int(match[1])
            assert current not in bank, ('Duplicate question', current)
            bank[current] = match[2].splitlines()
        elif current is not None and block:
            bank[current].extend(block.splitlines())
    assert set(bank) == set(range(1, expected + 1)), ('Missing questions', sorted(bank))
    return bank


def parse(path, section, expected):
    blocks, _, media = read_doc(path)
    assert media == (['word/media/image1.png'] if section == 'reasoning' else []), 'Unexpected media requires review'
    a = next(i for i, block in enumerate(blocks) if block.startswith('SECTION A'))
    b = next(i for i, block in enumerate(blocks) if block.startswith('SECTION B'))
    k = blocks.index('COMMON ANSWER KEY')
    s = next(i for i, block in enumerate(blocks) if block.startswith('DETAILED'))
    duration = next(int(match[1]) for block in blocks[:a] if (match := re.search(r'Time Allowed:\s*(\d+)\s*minutes', block)))
    assert any(f'Total Questions: {expected}' in block for block in blocks[:a])
    versions = {'en': split_paper(blocks[a + 1:b], expected), 'te': split_paper(blocks[b + 1:k], expected)}
    keys = {}
    for table in blocks[k + 1:s]:
        rows = table.splitlines()
        if not rows or not rows[0].startswith('Q.No'):
            continue
        assert len(rows[0].split('|')) == 8
        for row in rows[1:]:
            cells = [cell.strip() for cell in row.split('|')]
            assert len(cells) == 8, row
            for offset in (0, 4):
                number = int(cells[offset].removeprefix('Q'))
                assert number not in keys and cells[offset + 1] in list('ABCD'), row
                keys[number] = cells[offset + 1]
    assert set(keys) == set(range(1, expected + 1)), 'Missing/extra summary keys'
    solutions, current = {}, None
    for block in blocks[s + 1:]:
        match = re.fullmatch(r'Q(\d{3})\s*[—–-]\s*(?:Solution)?', block)
        if match:
            current = int(match[1])
            assert current not in solutions, ('Duplicate solution', current)
            solutions[current] = []
        elif current is not None and block:
            solutions[current].extend(block.splitlines())
    assert set(solutions) == set(keys), 'Missing/extra solutions'
    questions, flags, repairs = [], [], []
    for number in range(1, expected + 1):
        text, options = {}, {}
        for language, bank in versions.items():
            lines = bank[number]
            indexes = [i for i, line in enumerate(lines) if re.match(r'^[ABCD]\)\s*', line)]
            if section == 'reasoning' and number == 21:
                # An author pasted the solved diagram and a second Telugu copy into
                # the English question. Keep the first four options only; the
                # corresponding bilingual explanation already exists in solutions.
                assert len(indexes) >= 4
                indexes = indexes[:4]
                tail = lines[indexes[-1] + 1:]
                if tail:
                    assert any('correct answer is B)' in line or 'సరైన సమాధానం: B' in line for line in tail), tail
                    repairs.append({'question': number, 'language': language, 'repair': 'Removed pasted answer/diagram explanation and conversation from the question; preserved solution separately.'})
                lines = lines[:indexes[-1] + 1]
            assert len(indexes) == 4 and [lines[i][0] for i in indexes] == list('ABCD'), (section, language, number, 'Expected four options')
            assert indexes == list(range(indexes[0], len(lines))), (section, language, number, 'Unexpected trailing or split content', lines[indexes[-1] + 1:])
            stem = lines[:indexes[0]]
            if section == 'reasoning' and number == 21 and language == 'te':
                assert stem[0].startswith('వెన్ చిత్రం (Venn Diagram)')
                stem = stem[1:]  # Remove the pasted conversational introduction.
                repairs.append({'question': number, 'language': language, 'repair': 'Removed the conversational introduction before the Telugu question.'})
            if section == 'arithmetic' and number == 48:
                # Q048 depends on the district table shown earlier in Q034.
                shared = [line for line in bank[34] if '|' in line]
                assert len(shared) == 6 and '2026' in shared[0]
                stem = stem + shared
                repairs.append({'question': number, 'language': language, 'repair': 'Included the source Q034 table needed by Q048.'})
            text[language] = '\n'.join(stem)
            options[language] = [re.sub(r'^[ABCD]\)\s*', '', lines[i]) for i in indexes]
            assert text[language] and all(options[language]), (section, number)
            assert not re.search(r'correct answer is|Answer:|Explanation:|సరైన సమాధానం:|తెలుగు వివరణ:|You are completely right|Would you like', text[language] + '\n'.join(options[language]), re.I), (section, number, 'Solution leak')
        explanation, language = {'en': [], 'te': []}, 'en'
        for line in solutions[number]:
            clean = re.sub(r'^•\s*', '', line)
            if section == 'reasoning' and number == 21 and clean.startswith(('You are completely right', 'Would you like')):
                continue  # Conversation is not part of the academic explanation.
            if re.match(r'^[\u0c00-\u0c7f]', clean):
                language = 'te'
            elif clean.startswith(('English', 'Why Other', 'Distractor Analysis', 'Exam Tip', 'Common Mistake', 'Answer:', 'Topic:')):
                language = 'en'
            explanation[language].append(clean)
        assert explanation['en'] and explanation['te'], (section, number, 'Missing bilingual explanation')
        english = '\n'.join(explanation['en'])
        explicit = set(re.findall(r'^Answer:\s*([ABCD])\b', english, re.M))
        if explicit and explicit != {keys[number]}:
            flags.append({'question': number, 'issue': 'Source solution/key mismatch', 'tableKey': keys[number], 'solutionKeys': sorted(explicit)})
        if re.search(r'\bwait\b|inconsisten|discrepanc|not match|not listed|no valid|mismatch|flawed|key stability|designated|nearest|approximately|≈|adjustment|instead of|rounding|re-verify', english, re.I):
            flags.append({'question': number, 'issue': 'Source worked solution contains contradictory, approximate, or corrective wording requiring author review; source key retained.'})
        questions.append({
            'id': f'{TEST_ID}-{section}-{number:03}', 'section': section,
            'text': text, 'options': options, 'correct': 'ABCD'.index(keys[number]),
            'explanation': {lang: '\n'.join(lines) for lang, lines in explanation.items()},
            'avgSeconds': 0,
        })
    return questions, {
        'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'section': section, 'questions': expected, 'durationMinutes': duration,
        'answerKeys': len(keys), 'solutions': len(solutions),
        'answerPolicy': 'Preserve this source summary key and bilingual explanations; unresolved content contradictions are flagged, not silently rewritten.',
        'answerDistribution': dict(Counter(keys.values())), 'importRepairs': repairs,
        'reviewFlags': [{**flag, 'testQuestion': flag['question'] + {'arithmetic': 0, 'reasoning': 50, 'gs': 100}[section]} for flag in flags],
        'media': [{'path': name, 'usage': 'Reasoning Q021 solution diagram. All relationships are also described in the bilingual solution text; not exposed in the question API.', 'sha256': hashlib.sha256(ZipFile(path).read(name)).hexdigest()} for name in media],
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('paths', nargs=3, type=Path, help='Arithmetic, Reasoning, General Studies')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    bank, reports = [], []
    for path, section, count in zip(args.paths, ('arithmetic', 'reasoning', 'gs'), (50, 50, 100), strict=True):
        questions, report = parse(path, section, count)
        bank.extend(questions)
        reports.append(report)
        print(f'{section}: {len(questions)} bilingual questions, {report["durationMinutes"]} minutes, {len(report["reviewFlags"])} source flags')
    assert len(bank) == len({q['id'] for q in bank}) == 200
    assert sum(report['durationMinutes'] for report in reports) == 190
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        "// Generated by scripts/import_si_mock_03.py. Source keys/solutions and review flags: docs/si-mock-03.sources.json.\n"
        "import type { Question } from '@tslprb/fixtures';\n\n"
        'export const SI_MOCK_03_QUESTIONS: Question[] = '
        + json.dumps(bank, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8')
    args.report.write_text(json.dumps(reports, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    main()
