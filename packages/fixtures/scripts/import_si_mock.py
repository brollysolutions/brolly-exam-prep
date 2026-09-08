"""Import the supplied bilingual Brolly DOCX papers without flattening Word maths."""

import argparse
import json
import re
from collections import Counter
from pathlib import Path
from zipfile import ZipFile
import xml.etree.ElementTree as ET

NS = {
    'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main',
    'm': 'http://schemas.openxmlformats.org/officeDocument/2006/math',
}


def tag(node):
    return node.tag.split('}')[-1]


def math_text(node):
    name = tag(node)
    child = lambda key: math_text(node.find('m:' + key, NS)) if node.find('m:' + key, NS) is not None else ''
    if name.endswith('Pr'):
        return ''
    if name in ('t',):
        return node.text or ''
    if name == 'f':
        fraction_type = node.find('m:fPr/m:type', NS)
        if fraction_type is not None and fraction_type.get('{' + NS['m'] + '}val') == 'noBar':
            return 'C(' + child('num') + ', ' + child('den') + ')'
        return '(' + child('num') + ')/(' + child('den') + ')'
    if name == 'sSup':
        return child('e') + '^(' + child('sup') + ')'
    if name == 'sSub':
        return child('e') + '_(' + child('sub') + ')'
    if name == 'sSubSup':
        return child('e') + '_(' + child('sub') + ')^(' + child('sup') + ')'
    if name == 'rad':
        degree = child('deg')
        return ('√' if not degree or degree == '2' else 'root[' + degree + ']') + '(' + child('e') + ')'
    if name == 'd':
        props = node.find('m:dPr', NS)
        def delimiter(key, default):
            el = props.find('m:' + key, NS) if props is not None else None
            return el.get('{' + NS['m'] + '}val', default) if el is not None else default
        return delimiter('begChr', '(') + ', '.join(math_text(e) for e in node.findall('m:e', NS)) + delimiter('endChr', ')')
    if name == 'eqArr':
        return '\n'.join(math_text(e) for e in node.findall('m:e', NS))
    if name == 'm':
        return '[' + '; '.join(', '.join(math_text(e) for e in row.findall('m:e', NS)) for row in node.findall('m:mr', NS)) + ']'
    if name == 'bar':
        return 'overline(' + child('e') + ')'
    if name in ('nary', 'groupChr'):
        props = node.find('m:' + name + 'Pr', NS)
        symbol = props.find('m:chr', NS) if props is not None else None
        operator = symbol.get('{' + NS['m'] + '}val', '∫' if name == 'nary' else '⏟') if symbol is not None else '∫'
        return operator + ('_(' + child('sub') + ')' if child('sub') else '') + ('^(' + child('sup') + ')' if child('sup') else '') + '(' + child('e') + ')'
    return ''.join(math_text(c) for c in node)


def inline(node):
    if node.tag.startswith('{' + NS['m'] + '}'):
        return math_text(node)
    name = tag(node)
    if name in ('pPr', 'rPr', 'del'):
        return ''
    if name == 't':
        return node.text or ''
    if name in ('br', 'cr'):
        return '\n'
    if name == 'tab':
        return ' '
    text = ''.join(inline(c) for c in node)
    if name == 'r':
        vertical = node.find('w:rPr/w:vertAlign', NS)
        if vertical is not None:
            value = vertical.get('{' + NS['w'] + '}val')
            if value == 'superscript':
                return '^(' + text + ')'
            if value == 'subscript':
                return '_(' + text + ')'
    return text


def read_doc(path):
    with ZipFile(path) as archive:
        root = ET.fromstring(archive.read('word/document.xml'))
        numbering = ET.fromstring(archive.read('word/numbering.xml'))
        media = [n for n in archive.namelist() if n.startswith('word/media/')]
    # Keep automatic Word statement numbers, which are not stored in paragraph text.
    counts = {}
    num_defs = {}
    for num in numbering.findall('w:num', NS):
        num_id = num.get('{' + NS['w'] + '}numId')
        abstract_id = num.find('w:abstractNumId', NS).get('{' + NS['w'] + '}val')
        abstract = numbering.find("w:abstractNum[@w:abstractNumId='" + abstract_id + "']", NS)
        num_defs[num_id] = abstract

    def paragraph(p):
        text = inline(p).strip()
        num = p.find('w:pPr/w:numPr/w:numId', NS)
        if num is not None:
            num_id = num.get('{' + NS['w'] + '}val')
            level = p.find('w:pPr/w:numPr/w:ilvl', NS)
            level_id = level.get('{' + NS['w'] + '}val') if level is not None else '0'
            definition = num_defs.get(num_id)
            lvl = definition.find("w:lvl[@w:ilvl='" + level_id + "']", NS) if definition is not None else None
            if lvl is not None:
                fmt = lvl.find('w:numFmt', NS).get('{' + NS['w'] + '}val')
                start = int(lvl.find('w:start', NS).get('{' + NS['w'] + '}val'))
                key = (num_id, level_id)
                counts[key] = counts.get(key, start - 1) + 1
                n = counts[key]
                prefix = chr(96 + n) if fmt == 'lowerLetter' else str(n)
                if fmt == 'bullet':
                    prefix = '•'
                text = prefix + ('. ' if fmt != 'bullet' else ' ') + text
        return text

    blocks = []
    for node in root.find('w:body', NS):
        if tag(node) == 'p':
            blocks.append(paragraph(node))
        elif tag(node) == 'tbl':
            rows = []
            for row in node.findall('w:tr', NS):
                rows.append(' | '.join(' '.join(paragraph(p) for p in cell.findall('w:p', NS)) for cell in row.findall('w:tc', NS)))
            blocks.append('\n'.join(rows))
    return blocks, root, media


def split_questions(blocks):
    result = {}
    current = None
    for block in blocks:
        match = re.fullmatch(r'Q(\d{3})(?:\s*[—–-]\s*Solution)?', block)
        if match:
            current = int(match[1])
            assert current not in result, ('Duplicate question', current)
            result[current] = []
        elif current is not None and block and not re.fullmatch(r'Questions \d+\s*[–—-]\s*\d+', block):
            result[current].append(block)
    return result


def parse_doc(path, section, expected):
    blocks, root, media = read_doc(path)
    assert not media, 'Images require a separate import path'
    a = next(i for i, b in enumerate(blocks) if b.startswith('SECTION A —'))
    b = next(i for i, b in enumerate(blocks) if b.startswith('SECTION B —'))
    key_start = blocks.index('COMMON ANSWER KEY')
    solutions_start = next(i for i, b in enumerate(blocks) if b.startswith('DETAILED'))
    versions = {'en': split_questions(blocks[a + 1:b]), 'te': split_questions(blocks[b + 1:key_start])}
    solutions = split_questions(blocks[solutions_start + 1:])
    keys = {}
    for row in '\n'.join(blocks[key_start + 1:solutions_start]).splitlines()[1:]:
        cells = [cell.strip() for cell in row.split('|')]
        assert len(cells) == 8, row
        for offset in (0, 4):
            number = int(cells[offset])
            assert number not in keys
            keys[number] = 'ABCD'.index(cells[offset + 1])
    for bank in (*versions.values(), solutions, keys):
        assert set(bank) == set(range(1, expected + 1)), (path, sorted(bank))
    # The data table precedes Q049 but applies to BOTH Q049 and Q050.
    if section == 'arithmetic':
        for language, bank in versions.items():
            previous = bank[48]
            marker = next(i for i, line in enumerate(previous) if '049 & 050' in line)
            context = previous[marker:]
            bank[48] = previous[:marker]
            bank[49] = context + bank[49]
            bank[50] = context + bank[50]
    questions = []
    for number in range(1, expected + 1):
        texts, options = {}, {}
        for language, bank in versions.items():
            lines = bank[number]
            option_indexes = [i for i, line in enumerate(lines) if re.match(r'^[ABCD]\)\s*', line)]
            assert len(option_indexes) == 4, (section, language, number, lines)
            assert [lines[i][0] for i in option_indexes] == list('ABCD')
            assert option_indexes == list(range(option_indexes[0], len(lines))), (section, number, 'Trailing content', lines)
            texts[language] = '\n'.join(lines[:option_indexes[0]])
            options[language] = [re.sub(r'^[ABCD]\)\s*', '', lines[i]) for i in option_indexes]
            assert texts[language] and all(options[language])
            assert not re.search(r'English Explanation|తెలుగు వివరణ|Correct Answer', texts[language])
        explanation = {'en': [], 'te': []}
        language = 'en'
        for line in solutions[number]:
            clean = re.sub(r'^•\s*', '', line)
            if clean.startswith(('తెలుగు వివరణ:', 'తెలుగు షార్ట్‌కట్:')):
                language = 'te'
            elif clean.startswith(('English Explanation:', 'English Shortcut:', 'Why Other Options', 'Exam Tip:', 'Common Mistake:', 'Correct Answer:')):
                language = 'en'
            explanation[language].append(line)
        assert explanation['en'], (section, number, 'Missing explanation')
        # Some Arithmetic solutions only supply English; retain that text, never invent Telugu.
        english = '\n'.join(explanation['en'])
        telugu = '\n'.join(explanation['te']) or english
        questions.append({
            'id': f'si-brolly-01-{section}-{number:03}',
            'section': section,
            'text': texts,
            'options': options,
            'correct': keys[number],
            'explanation': {'en': english, 'te': telugu},
            'avgSeconds': 0,
        })
    print(f'{path.name}: {expected} bilingual questions; {len(keys)} keys; {len(solutions)} solutions')
    return questions


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('paths', nargs='+', type=Path)
    parser.add_argument('--inspect', action='store_true')
    parser.add_argument('--output', type=Path)
    parser.add_argument('--report', type=Path)
    args = parser.parse_args()
    if args.output:
        assert len(args.paths) == 3, 'Pass Arithmetic, Reasoning, General Studies in that order'
        bank = []
        for path, section, count in zip(args.paths, ('arithmetic', 'reasoning', 'gs'), (50, 50, 100)):
            bank.extend(parse_doc(path, section, count))
        from si_mock_corrections import correct_bank
        changes = correct_bank(bank)
        print('Reviewed corrections:', len(changes))
        assert len(bank) == len({q['id'] for q in bank}) == 200
        output = "// Generated by scripts/import_si_mock.py from the three supplied Brolly DOCX papers.\n"
        output += "// Reviewed corrections are applied from scripts/si_mock_corrections.py; see docs/si-mock-import.md.\n"
        output += "import type { Question } from './questions';\n\n"
        output += 'export const SI_MOCK_01_QUESTIONS: Question[] = ' + json.dumps(bank, ensure_ascii=False, indent=2) + ';\n'
        args.output.write_text(output, encoding='utf-8')
        print('Generated', args.output, 'with 200 unique questions')
        for section, n, reason in changes:
            print(f'{section} Q{n:03}: {reason}')
        if args.report:
            offsets = {'arithmetic': 0, 'reasoning': 50, 'gs': 100}
            report = '# SI Mock Test 01 correction register\n\n'
            report += 'Generated from the explicit reviewed corrections; source numbering restarts in each DOCX.\n\n'
            report += '| Combined question | Source | Correction |\n| --- | --- | --- |\n'
            for section, n, reason in changes:
                report += f'| {offsets[section] + n} | {section} Q{n:03} | {reason} |\n'
            args.report.write_text(report, encoding='utf-8')
        return
    for path in args.paths:
        blocks, root, media = read_doc(path)
        print(path.name, 'blocks:', len(blocks), 'media:', media)
        print('Math tags:', dict(Counter(tag(n) for n in root.iter() if n.tag.startswith('{' + NS['m'] + '}'))))
        for i, block in enumerate(blocks):
            if re.search(r'COMMON ANSWER|DETAILED|Q001.*Solution|SECTION [AB]', block):
                print('\nAT', i, '\n' + '\n'.join(blocks[i:i + 20]))


if __name__ == '__main__':
    main()
