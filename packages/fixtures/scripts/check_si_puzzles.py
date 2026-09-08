"""Exhaustive arrangement checks used while repairing the source reasoning paper."""
from itertools import permutations


def circle3(b_offset=3):
    matches = []
    for rest in permutations('BCDEFGH'):
        row = ('A',) + rest
        p = {v: i for i, v in enumerate(row)}
        if (p['C'] - p['A']) % 8 != 3 or (p['C'] - p['E']) % 8 != 2:
            continue
        if any((p['D'] - p[x]) % 8 in (1, 7) for x in 'AC'):
            continue
        if (p['D'] - p['B']) % 8 != b_offset:
            continue
        if not all((p['G'] - p[x]) % 8 in (1, 7) for x in 'BC'):
            continue
        if (p['F'] - p['B']) % 8 != 2:
            continue
        matches.append((''.join(row), row[(p['H'] + 1) % 8]))
    return matches


def boxes10(gap=3):
    matches = []
    for row in permutations('JKLMN'):
        p = {v: i for i, v in enumerate(row)}  # top to bottom
        if p['K'] + 1 == p['N'] and p['M'] < p['L'] < p['J'] and p['M'] != 0 and abs(p['M'] - p['N']) == gap:
            matches.append(''.join(row))
    return matches


def row13(pq_gap=4, rp_gap=2):
    matches = []
    for row in permutations('PQRSTUV'):
        p = {v: i for i, v in enumerate(row)}
        if p['Q'] - p['P'] == pq_gap and p['P'] - p['R'] == rp_gap and p['S'] == p['Q'] + 1 and abs(p['S'] - p['T']) == 2 and p['V'] == p['U'] + 1:
            matches.append((''.join(row), p['V'] - p['R']))
    return matches


def days19(cb_gap=3, da_gap=2):
    matches = []
    for row in permutations('ABCDEF'):
        p = {v: i for i, v in enumerate(row)}
        if p['D'] == 2 and abs(p['D'] - p['A']) == da_gap and p['C'] < p['A'] and abs(p['C'] - p['B']) == cb_gap and p['E'] == p['F'] + 1:
            matches.append((''.join(row), p['E']))
    return matches


def floors31():
    matches = []
    for row in permutations('1234567'):
        p = {v: i + 1 for i, v in enumerate(row)}
        if p['3'] in (5, 7) and abs(p['3'] - p['6']) == 3 and p['1'] == p['5'] + 1 and p['7'] % 2 == 0 and p['2'] == p['7'] + 1 and p['4'] < p['5']:
            matches.append((''.join(row), row[3]))
    return matches


def square36(m_offset=1):
    matches = []
    for row in permutations('KLMNOPQR'):
        p = {v: i for i, v in enumerate(row)}
        if p['K'] not in (0, 1):
            continue
        if p['K'] // 2 == p['L'] // 2 and (p['L'] - p['P']) % 8 == 2 and (p['Q'] - p['K']) % 8 == 4 and (p['M'] - p['Q']) % 8 == m_offset % 8 and (p['N'] // 2 - p['L'] // 2) % 4 == 2 and (p['O'] - p['N']) % 8 in (1, 7):
            matches.append((''.join(row), row[(p['P'] + 4) % 8]))
    return matches


if __name__ == '__main__':
    assert circle3() == []
    assert circle3(1) == [('AEHCGBDF', 'C')]
    assert boxes10() == []
    assert boxes10(1) == ['KNMLJ']
    assert row13() == []
    assert row13(rp_gap=1) == [('RPUVTQS', 3)]
    assert days19() == []
    assert days19(cb_gap=2) == [('FEDCAB', 1)]
    assert len(floors31()) == 2
    assert [(row, answer) for row, answer in floors31() if row[4] == '3'] == [('4651372', '1')]
    assert square36() == []
    assert square36(-1) == [('KLRMQNOP', 'M')]
    print('Verified six repaired arrangement puzzles: exactly one solution each.')
