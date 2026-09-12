"""Import the complete Constable III paper, keeping question and solution text separate."""

import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path
import re
import sys
from zipfile import ZipFile
from xml.etree import ElementTree as ET

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'packages/fixtures/scripts'))
from import_si_mock import read_doc

TEST_ID = 'pc-constable-03'
EXPECTED = set(range(1, 201))
SECTIONS = (('english', 25), ('arithmetic', 35), ('reasoning', 40), ('gs', 100))


def clean(text):
    return re.sub(r'^(?:\u2022\s*)+', '', text).strip()


def paper(blocks, expected):
    bank, current = {}, None
    for block in blocks:
        block = clean(block)
        match = re.match(r'^Q(\d{3})\.\s*(.*)$', block)
        if match:
            current = int(match[1])
            assert current not in bank, ('Duplicate question', current)
            bank[current] = [match[2]] if match[2] else []
        elif current is not None and block:
            bank[current].append(block)
    assert set(bank) == expected, ('Missing/extra questions', sorted(expected ^ set(bank)))
    if 20 in bank:
        start = next(i for i, text in enumerate(bank[20]) if text.startswith('Directions (Q021'))
        passage = bank[20][start:]
        assert len(passage) == 2 and 'modern penology' in passage[1]
        bank[20] = bank[20][:start]
        for number in range(21, 26):
            bank[number] = passage + bank[number]
    parsed = {}
    for number, lines in bank.items():
        indexes = [i for i, line in enumerate(lines) if re.match(r'^[ABCD]\)\s*', line)]
        assert len(indexes) == 4 and [lines[i][0] for i in indexes] == list('ABCD'), (number, lines)
        assert indexes == list(range(indexes[0], indexes[0] + 4)), (number, 'Split options')
        trailing = lines[indexes[-1] + 1:]
        if trailing:
            assert number in (25, 60) and len(trailing) == 1, (number, 'Unexpected trailing text', trailing)
            assert re.search(r'Q0(?:26|61)', trailing[0]), trailing
        stem = '\n'.join(lines[:indexes[0]])
        options = [re.sub(r'^[ABCD]\)\s*', '', lines[i]) for i in indexes]
        assert stem and all(options), number
        assert not re.search(r'Correct Answer|Explanation:|Calculation:|వివరణ:', stem + '\n'.join(options)), (number, 'Solution leak')
        parsed[number] = (stem, options)
    return parsed


def parse(path):
    blocks, _, media = read_doc(path)
    assert not media, 'Embedded images require explicit extraction'
    with ZipFile(path) as archive:
        relationships = ET.fromstring(archive.read('word/_rels/document.xml.rels'))
        links = [r.get('Target') for r in relationships if r.get('TargetMode') == 'External']
    assert not links, ('External question sources need review', links)
    a = next(i for i, text in enumerate(blocks) if text.startswith('SECTION A'))
    b = next(i for i, text in enumerate(blocks) if text.startswith('SECTION B'))
    s = next(i for i, text in enumerate(blocks) if clean(text).startswith('DETAILED BILINGUAL SOLUTIONS'))
    english = paper(blocks[a + 1:b], EXPECTED)
    telugu = paper(blocks[b + 1:s], set(range(26, 201)))
    assert 'Q001' in blocks[b + 1] and 'Q025' in blocks[b + 1]
    telugu.update({n: english[n] for n in range(1, 26)})
    solutions, current, language = {}, None, None
    for block in blocks[s:]:
        block = clean(block)
        if not block or block.startswith('DETAILED BILINGUAL SOLUTIONS'):
            continue
        heading = re.fullmatch(r'Q(\d{3})\s*[—–-]\s*Solution', block)
        if heading:
            current, language = int(heading[1]), None
            assert current not in solutions, ('Duplicate solution', current)
            solutions[current] = {'en': [], 'te': []}
            continue
        assert current is not None, ('Unexpected solution preamble', block)
        key = re.fullmatch(r'Correct Answer:\s*([ABCD])', block)
        if key:
            assert 'key' not in solutions[current], ('Duplicate key', current)
            solutions[current]['key'] = key[1]
            continue
        # Q184 uses the source label "Telugu nature" for its Telugu explanation.
        label = re.match(r'^(English (?:Explanation|Calculation)|తెలుగు (?:వివరణ|స్వభావం)):\s*(.*)$', block)
        if label:
            language = 'en' if label[1].startswith('English') else 'te'
            block = label[2]
        assert language is not None, ('Unlabelled explanation', current, block)
        if block:
            solutions[current][language].append(block)
    assert set(solutions) == EXPECTED, 'Expected 200 solutions'
    bank, flags = [], []
    for number in range(1, 201):
        solution = solutions[number]
        assert solution.get('key') and solution['en'] and solution['te'], ('Incomplete solution', number)
        section = next(section for section, last in (('english', 25), ('arithmetic', 60), ('reasoning', 100), ('gs', 200)) if number <= last)
        question = {
            'id': f'{TEST_ID}-{section}-{number:03}', 'section': section,
            'text': {'en': english[number][0], 'te': telugu[number][0]},
            'options': {'en': english[number][1], 'te': telugu[number][1]},
            'correct': 'ABCD'.index(solution['key']),
            'explanation': {lang: '\n'.join(solution[lang]) for lang in ('en', 'te')},
            'avgSeconds': 0,
        }
        # Flag source caveats for author review; never silently rewrite supplied keys.
        caveats = [line for line in solution['en'] if re.search(r'incorrect|typo|mismatch|no (?:correct|valid) option|none of the (?:given|options)|error in|closest option|should (?:actually )?be', line, re.I)]
        if caveats:
            flags.append({'question': number, 'reason': 'Source explanation contains a possible caveat', 'sourceText': caveats})
        if 'underlined' in question['text']['en'].lower():
            flags.append({'question': number, 'reason': 'Question refers to an underline; plain-text question display does not preserve Word run styling.'})
        bank.append(question)
    assert Counter(q['section'] for q in bank) == dict(SECTIONS)
    report = {
        'file': path.name, 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
        'testId': TEST_ID, 'questions': len(bank), 'durationMinutes': 180,
        'sourceHeading': blocks[3],
        'sourceTiming': blocks[5],
        'timingPolicy': 'Full 200-question Constable mock uses the existing 180-minute pattern. The source front matter labels only Part 1 / 50 questions / 45 minutes, but the file contains Q001-Q200.',
        'sections': dict(SECTIONS), 'solutions': len(solutions), 'externalLinks': links,
        'englishQuestionsReusedInTelugu': list(range(1, 26)),
        'sharedPassageQuestions': list(range(21, 26)),
        'labelNormalizations': [{'question': 184, 'sourceLabel': 'తెలుగు స్వభావం', 'mappedTo': 'explanation.te'}],
        'answerPolicy': 'Retain every source Correct Answer letter and bilingual explanation. Automated review flags are not verified corrections.',
        'reviewFlags': flags,
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
    args.output.write_text(
        '// Generated from the user-supplied DOCX; see docs/constable-mock-03.sources.json.\n'
        "import type { Question } from '@tslprb/fixtures';\n\n"
        'export const CONSTABLE_MOCK_03_QUESTIONS: Question[] = '
        + json.dumps(bank, ensure_ascii=False, indent=2) + ';\n', encoding='utf-8',
    )
    args.report.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Imported {len(bank)} questions; {len(report["reviewFlags"])} source review flags')


if __name__ == '__main__':
    main()
