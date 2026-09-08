"""Import the three Series II papers faithfully; never apply Series I corrections."""
import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'packages/fixtures/scripts'))
from import_si_mock import read_doc, split_questions


def parse(path, section, expected):
    blocks, _, media = read_doc(path)
    assert not media, 'Embedded media needs explicit extraction'
    a = next(i for i, b in enumerate(blocks) if b.startswith('SECTION A'))
    b = next(i for i, b in enumerate(blocks) if b.startswith('SECTION B'))
    k = blocks.index('COMMON ANSWER KEY')
    s = next(i for i, b in enumerate(blocks) if b.startswith('DETAILED'))
    versions = {'en': split_questions(blocks[a+1:b]), 'te': split_questions(blocks[b+1:k])}
    solutions = split_questions(blocks[s+1:])
    keys = {}
    for table in blocks[k+1:s]:
        rows = table.splitlines()
        if not rows or not rows[0].startswith('Q.No'):
            continue
        width = len(rows[0].split('|')) // 2
        for row in rows[1:]:
            cells = [c.strip() for c in row.split('|')]
            assert len(cells) == width * 2, row
            for offset in (0, width):
                if not cells[offset]:
                    continue
                n = int(cells[offset])
                assert n not in keys, ('Duplicate key', section, n)
                keys[n] = 'ABCD'.index(cells[offset+1])
    recovered_keys = []
    for n in sorted(set(range(1, expected+1)) - set(keys)):
        explicit = set(re.findall(r'Correct (?:Option|Answer):\s*([ABCD])\b', '\n'.join(solutions.get(n, []))))
        assert len(explicit) == 1, (section, n, 'No unambiguous source key')
        keys[n] = 'ABCD'.index(explicit.pop())
        recovered_keys.append(n)
    for bank in (*versions.values(), solutions, keys):
        assert set(bank) == set(range(1, expected+1)), (section, 'Missing/extra question', sorted(bank))
    if section == 'arithmetic':
        # The shared data table sits after Q048's options but belongs to Q049/Q050.
        for bank in versions.values():
            marker = next(i for i, line in enumerate(bank[48]) if '049' in line and '050' in line)
            context = bank[48][marker:]
            bank[48] = bank[48][:marker]
            for n in (49, 50):
                bank[n] = context + bank[n]
    questions, flags = [], []
    for n in range(1, expected+1):
        text, options = {}, {}
        for language, bank in versions.items():
            lines = bank[n]
            indexes = [i for i,line in enumerate(lines) if re.match(r'^[ABCD]\)\s*', line)]
            assert len(indexes) == 4 and [lines[i][0] for i in indexes] == list('ABCD'), (section, language, n)
            assert indexes == list(range(indexes[0],len(lines))), (section, language, n, 'Unexpected trailing content')
            text[language] = '\n'.join(lines[:indexes[0]])
            options[language] = [re.sub(r'^[ABCD]\)\s*','',lines[i]) for i in indexes]
            assert text[language] and all(options[language])
            assert not re.search(r'Correct Answer|Correct Option|Explanation|వివరణ', text[language]), (section, n, 'Solution leak')
        explanation = {'en': [], 'te': []}
        language = 'en'
        for line in solutions[n]:
            clean = re.sub(r'^•\s*', '', line)
            if re.match(r'^[\u0c00-\u0c7f]', clean):
                language = 'te'
            elif clean.startswith(('English', 'Why Other', 'Exam Tip', 'Common Mistake', 'Correct Answer', 'Question Metadata')):
                language = 'en'
            explanation[language].append(line)
        assert explanation['en'], (section,n,'Missing explanation')
        english = '\n'.join(explanation['en'])
        telugu = '\n'.join(explanation['te']) or english
        metadata_keys = set(re.findall(r'Correct (?:Option|Answer):\s*([ABCD])\b', english))
        if metadata_keys and metadata_keys != {'ABCD'[keys[n]]}:
            flags.append({'question':n,'issue':'Source solution/key mismatch','key':'ABCD'[keys[n]],'solutionKeys':sorted(metadata_keys)})
        if re.search(r'Wait,|inconsisten|discrepanc|not match|not listed|incorrect|no valid|mismatch|flawed', english, re.I):
            flags.append({'question':n,'issue':'Source explanation contains wording requiring editorial review'})
        questions.append({'id':f'si-brolly-02-{section}-{n:03}', 'section':section, 'text':text,
                          'options':options, 'correct':keys[n], 'explanation':{'en':english,'te':telugu}, 'avgSeconds':0})
    return questions, {'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                       'section':section,'questions':expected,'answerKeys':len(keys),'solutions':len(solutions),
                       'keysRecoveredFromExplicitSolution':recovered_keys,
                       'reviewFlags':flags}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('paths', nargs=3, type=Path, help='Arithmetic, Reasoning, General Studies')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    bank, reports = [], []
    for path, section, count in zip(args.paths, ('arithmetic','reasoning','gs'),(50,50,100)):
        questions, report = parse(path,section,count)
        bank.extend(questions)
        reports.append(report)
        print(f'{section}: {len(questions)} bilingual questions with keys and solutions')
    assert len(bank) == len({q['id'] for q in bank}) == 200
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text("// Generated by scripts/import_si_mock_02.py. Source-authored keys/explanations, not editorially corrected.\nimport type { Question } from '@tslprb/fixtures';\n\nexport const SI_MOCK_02_QUESTIONS: Question[] = " + json.dumps(bank,ensure_ascii=False,indent=2) + ';\n',encoding='utf-8')
    args.report.write_text(json.dumps(reports,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')


if __name__ == '__main__':
    main()
