"""Freeze the site's selected terms and their evidence from the user's dictionary."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
GLOSSARY = ROOT / 'data' / 'terminology.json'

# Each translation is a selected dictionary sense, a documented compound,
# or an English fallback. Do not silently use similar-looking English keys.
TERMS = [
    ('Number theory', '数论', ['number theory']),
    ('Algebraic geometry', '代数几何', ['algebraic geometry']),
    ('Complex geometry', '复几何', ['complex geometry']),
    ('Real analysis', '实分析', ['real analysis']),
    ('Complex analysis', '复分析', ['complex analysis']),
    ('Convex geometry', '凸几何', ['convex geometry']),
    ('Metric geometry', '度量几何', ['metric geometry']),
    ('Theoretical computer science', '理论计算机科学', ['computer science']),
    ('Dynamical systems', '动力系统', ['dynamical system']),
    ('Ergodic theory', '遍历理论', ['ergodic theory']),
    ('Combinatorics', '组合学', ['combinatorics']),
    ('Algebra', '代数学', ['algebra']),
    ('Probability theory', '概率论', ['probability theory']),
    ('Statistical mechanics', '统计力学', ['statistical mechanics']),
    ('Mathematical logic', '数理逻辑', ['mathematical logic']),
    ('Group theory', '群论', ['group theory']),
    ('Mathematical physics', '数学物理', ['mathematical physics']),
    ('Operator algebras', '算子代数', ['operator algebra']),
    ('Topology', '拓扑学', ['topology']),
    ('Functional analysis', '泛函分析', ['functional analysis']),
    ('Differential geometry', '微分几何', ['differential geometry']),
    ('Partial differential equations', '偏微分方程', ['partial differential equation (=ODE)']),
    ('L-functions', 'L 函数', ['function', 'L-function']),
    ('Elliptic curves', '椭圆曲线', ['elliptic curve']),
    ('Diophantine problems', '丢番图问题', ['Diophantine problem']),
    ('Galois theory', '伽罗瓦理论', ['Galois theory']),
    ('Birational geometry', '双有理几何', ['birational geometry']),
    ('Hodge theory', '霍奇理论', ['Hodge theory']),
    ('Moduli spaces', '模空间', ['moduli space (']),
    ('Enumerative invariants', '枚举不变量', ['enumerative', 'invariant']),
    ('Harmonic analysis', '调和分析', ['harmonic analysis']),
    ('Approximation theory', '逼近论', ['approximation theory']),
    ('Special functions', '特殊函数', ['special function']),
    ('Several complex variables', '多复变量', ['several complex variables']),
    ('Convex bodies', '凸体', ['convex body']),
    ('Isoperimetric problems', '等周问题', ['isoperimetric problem']),
    ('Packings', '堆积', ['packing']),
    ('Metric embeddings', '度量嵌入', ['metric', 'embedding']),
    ('Computational complexity', '计算复杂性', ['computational complexity']),
    ('Algorithms', '算法', ['algorithm']),
    ('Hardness of approximation', 'hardness of approximation', []),
    ('Information theory', '信息论', ['information theory']),
    ('Smooth dynamical systems', '光滑动力系统', ['smooth dynamical system']),
    ('Entropy', '熵', ['entropy']),
    ('Rigidity', '刚性', ['rigidity']),
    ('Extremal combinatorics', '极值组合学', ['extremal combinatorics']),
    ('Additive combinatorics', '加性组合学', ['additive', 'combinatorics']),
    ('Ramsey theory', '拉姆齐理论', ['Ramsey theory']),
    ('Graph theory', '图论', ['graph theory']),
    ('Matroids', '拟阵', ['matroid']),
    ('Commutative algebra', '交换代数', ['commutative algebra']),
    ('Representation theory', '表示论', ['representation theory']),
    ('Rings', '环', ['ring']),
    ('Modules', '模', ['module']),
    ('Random structures', '随机结构', ['random structure']),
    ('Spin glasses', 'spin glasses', []),
    ('Percolation', '渗流', ['percolation']),
    ('Random matrices', '随机矩阵', ['random matrix']),
    ('Set theory', '集合论', ['set theory']),
    ('Model theory', '模型论', ['model theory']),
    ('Computability', '可计算性', ['computability']),
    ('Geometric group theory', '几何群论', ['geometric group theory']),
    ('Artin groups', 'Artin 群', ['group']),
    ('Finite groups', '有限群', ['finite group']),
    ('Profinite groups', '投射有限群', ['profinite group']),
    ('Quantum spin systems', '量子自旋系统', ['quantum', 'spin system']),
    ('Kinetics', '动理学', ['kinetics']),
    ('Integrable systems', '可积系统', ['integrable system']),
    ('von Neumann algebras', '冯·诺伊曼代数', ['von Neumann algebra']),
    ('C*-algebras', 'C* 代数', ['algebra']),
    ('Free probability', '自由概率', ['free probability']),
    ('Low-dimensional topology', '低维拓扑', ['low-dimensional topology']),
    ('Manifolds', '流形', ['manifold']),
    ('Homotopy theory', '同伦论', ['homotopy theory']),
    ('Banach spaces', '巴拿赫空间', ['Banach space']),
    ('Operator theory', '算子理论', ['operator theory']),
    ('Spectral theory', '谱理论', ['spectral theory']),
    ('Curvature', '曲率', ['curvature']),
    ('Kähler geometry', '凯勒几何', ['Kähler manifold', 'geometry']),
    ('Minimal surfaces', '极小曲面', ['minimal surface']),
    ('Symplectic geometry', '辛几何', ['symplectic geometry']),
    ('Fluids', '流体', ['fluid']),
    ('Elliptic equations', '椭圆型方程', ['elliptic equation']),
    ('Dispersive equations', '色散方程', ['dispersive equation']),
    ('Regularity', '正则性', ['regularity']),
]

NOTES = {
    'Theoretical computer science': '完整词组未收录；计算机科学采用 computer science，理论为学科修饰语。',
    'Partial differential equations': '采用词条中文；词典键中的 (=ODE) 是误注，不用于英文显示。PDE 与 ODE 不混同。',
    'L-functions': 'L-function 条目与 L²-function 粘连，不能直接采用；保留数学符号 L，函数采用 function。',
    'Moduli spaces': '原词条括号断行为 moduli space ( → 参)模空间；恢复为（参）模空间，页面选用模空间。',
    'Enumerative invariants': '完整词组未收录；按枚举的和不变量组合。',
    'Metric embeddings': '完整词组未收录；按度量和嵌入组合，不误用 isometric embedding（等距嵌入）。',
    'Hardness of approximation': '完整词组未收录，保留英文；不将 approximation theory 的逼近论直接套到计算复杂性语境。',
    'Smooth dynamical systems': '对应词条为单数 smooth dynamical system → 光滑动力系统。smooth dynamics 未独立收录，页面改用明确的系统术语。',
    'Additive combinatorics': '完整词组未收录；按加性的和组合学组合。',
    'Spin glasses': '完整术语未收录，保留英文，等待补充核定译名。',
    'Artin groups': 'Artin group 未收录，保留专名 Artin；不能套用 Artinian group，因为二者是不同概念。',
    'Quantum spin systems': '完整词组未收录；按量子和自旋系统组合。',
    'C*-algebras': '保留数学符号 C*，代数采用 algebra。',
    'Kähler geometry': '完整词组未收录；凯勒专名来自 Kähler manifold，几何来自 geometry。',
}

# English subject names match overview.tex exactly. The labels and topics
# below refer to the reviewed terms above rather than duplicate translations.
SUBJECTS = [
    ('Number theory', 160, ['Number theory'], ['L-functions', 'Elliptic curves', 'Diophantine problems', 'Galois theory']),
    ('Algebraic and complex geometry', 308, ['Algebraic geometry', 'Complex geometry'], ['Birational geometry', 'Hodge theory', 'Moduli spaces', 'Enumerative invariants']),
    ('Real and complex analysis', 96, ['Real analysis', 'Complex analysis'], ['Harmonic analysis', 'Approximation theory', 'Special functions', 'Several complex variables']),
    ('Convex and metric geometry', 245, ['Convex geometry', 'Metric geometry'], ['Convex bodies', 'Isoperimetric problems', 'Packings', 'Metric embeddings']),
    ('Theoretical computer science', 33, ['Theoretical computer science'], ['Computational complexity', 'Algorithms', 'Hardness of approximation', 'Information theory']),
    ('Dynamical systems and ergodic theory', 181, ['Dynamical systems', 'Ergodic theory'], ['Ergodic theory', 'Smooth dynamical systems', 'Entropy', 'Rigidity']),
    ('Combinatorics', 329, ['Combinatorics'], ['Extremal combinatorics', 'Additive combinatorics', 'Ramsey theory', 'Graph theory', 'Matroids']),
    ('Algebra', 118, ['Algebra'], ['Commutative algebra', 'Representation theory', 'Rings', 'Modules']),
    ('Probability and statistical mechanics', 266, ['Probability theory', 'Statistical mechanics'], ['Random structures', 'Spin glasses', 'Percolation', 'Random matrices']),
    ('Mathematical logic', 54, ['Mathematical logic'], ['Set theory', 'Model theory', 'Computability']),
    ('Group theory', 202, ['Group theory'], ['Geometric group theory', 'Artin groups', 'Finite groups', 'Profinite groups']),
    ('Mathematical physics', 351, ['Mathematical physics'], ['Quantum spin systems', 'Kinetics', 'Integrable systems']),
    ('Operator algebras', 139, ['Operator algebras'], ['von Neumann algebras', 'C*-algebras', 'Free probability']),
    ('Topology', 287, ['Topology'], ['Low-dimensional topology', 'Manifolds', 'Homotopy theory']),
    ('Functional analysis', 75, ['Functional analysis'], ['Banach spaces', 'Operator theory', 'Spectral theory']),
    ('Differential geometry', 224, ['Differential geometry'], ['Curvature', 'Kähler geometry', 'Minimal surfaces', 'Symplectic geometry']),
    ('Partial differential equations', 12, ['Partial differential equations'], ['Fluids', 'Elliptic equations', 'Dispersive equations', 'Regularity']),
]


def load_subjects():
    frozen = json.loads(GLOSSARY.read_text(encoding='utf-8'))
    terms = frozen['terms']
    result = {}
    for subject in frozen['subjects']:
        topics = [{'en': key, 'zh': terms[key]['zh']} for key in subject['topics']]
        result[subject['name']] = {
            'zh': '与'.join(terms[key]['zh'] for key in subject['labels']),
            'description': '、'.join(t['zh'] for t in topics),
            'descriptionEn': ', '.join(t['en'] for t in topics),
            'topics': topics,
            'hue': subject['hue'],
        }
    return result


def refresh(dictionary):
    raw = dictionary.read_bytes()
    data = json.loads(raw.decode('utf-8-sig'))
    lookup = {key.casefold(): (key, value) for key, value in data['terms'].items()}
    terms = {}
    for en, zh, keys in TERMS:
        evidence = []
        for key in keys:
            if key.casefold() not in lookup:
                raise ValueError(f'Missing dictionary entry {key!r}; review before publishing.')
            exact, value = lookup[key.casefold()]
            evidence.append({'key': exact, 'value': value})
        terms[en] = {'zh': zh, 'dictionaryEntries': evidence}
        if en in NOTES:
            terms[en]['note'] = NOTES[en]
    frozen = {
        'source': 'tools/math-translator/dictionaries/merged.json',
        'sha256': hashlib.sha256(raw).hexdigest(),
        'dictionaryEntries': len(data['terms']),
        'terms': terms,
        'subjects': [{'name': name, 'hue': hue, 'labels': labels, 'topics': topics} for name, hue, labels, topics in SUBJECTS],
    }
    GLOSSARY.parent.mkdir(parents=True, exist_ok=True)
    GLOSSARY.write_text(json.dumps(frozen, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    catalogue = ROOT / 'public' / 'data' / 'catalog.json'
    if catalogue.exists():
        data = json.loads(catalogue.read_text(encoding='utf-8'))
        translated = load_subjects()
        for subject in data['subjects']:
            subject.update(translated[subject['name']])
        catalogue.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f'Updated {len(terms)} reviewed terms and {len(SUBJECTS)} subjects from the supplied dictionary.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dictionary', type=Path, help='Path to merged.json')
    args = parser.parse_args()
    dictionary = args.dictionary or next((p / 'math-translator/dictionaries/merged.json' for p in ROOT.parents if (p / 'math-translator/dictionaries/merged.json').exists()), None)
    if dictionary is None:
        parser.error('Provide --dictionary /path/to/merged.json; ordinary builds use the checked-in terminology snapshot.')
    refresh(dictionary)
