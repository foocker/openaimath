"""Create a pinned, validated reading index from openai/math (Python stdlib only)."""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import time
from urllib.parse import quote
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public' / 'data'
CACHE = ROOT / '.cache'
REPO = 'https://github.com/openai/math'
SUBJECTS = {
    'Number theory': ('数论', 'L 函数、椭圆曲线、丢番图问题与伽罗瓦理论', 160),
    'Algebraic and complex geometry': ('代数与复几何', '双有理几何、霍奇理论、模空间与计数不变量', 308),
    'Real and complex analysis': ('实分析与复分析', '调和分析、逼近论、特殊函数与多复变函数', 96),
    'Convex and metric geometry': ('凸几何与度量几何', '凸体、等周不等式、堆积与度量嵌入', 245),
    'Theoretical computer science': ('理论计算机科学', '计算复杂性、算法、近似困难性与信息论', 33),
    'Dynamical systems and ergodic theory': ('动力系统与遍历论', '遍历理论、光滑动力系统、熵与刚性', 181),
    'Combinatorics': ('组合数学', '极值与加性组合、拉姆齐理论、图论与拟阵', 329),
    'Algebra': ('代数学', '交换代数、表示论、环与模', 118),
    'Probability and statistical mechanics': ('概率论与统计力学', '随机结构、自旋玻璃、渗流与随机矩阵', 266),
    'Mathematical logic': ('数理逻辑', '集合论、模型论与可计算性', 54),
    'Group theory': ('群论', '几何群论、阿廷群、有限群与副有限群', 202),
    'Mathematical physics': ('数学物理', '量子自旋系统、动理学与可积系统', 351),
    'Operator algebras': ('算子代数', '冯·诺依曼代数、C* 代数与自由概率', 139),
    'Topology': ('拓扑学', '低维拓扑、流形与同伦论', 287),
    'Functional analysis': ('泛函分析', '巴拿赫空间、算子理论与谱理论', 75),
    'Differential geometry': ('微分几何', '曲率、凯勒几何、极小曲面与辛几何', 224),
    'Partial differential equations': ('偏微分方程', '流体、椭圆与色散方程、正则性', 12),
}


def fetch(url):
    for attempt in range(4):
        try:
            with urlopen(Request(url, headers={'User-Agent': 'openai-math-reader/1.0'}), timeout=45) as res:
                return res.read().decode('utf-8')
        except Exception:
            if attempt == 3:
                raise
            time.sleep(1 + attempt)


def cached(sha, path):
    target = CACHE / sha / path
    if target.exists():
        return target.read_text(encoding='utf-8')
    data = fetch(f'https://raw.githubusercontent.com/openai/math/{sha}/{quote(path)}')
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(data, encoding='utf-8')
    return data


def normalize(text):
    # GitHub's inline math delimiters become standard TeX delimiters.
    return re.sub(r'\$`(.*?)`\$', lambda m: r'\(' + m[1] + r'\)', text, flags=re.S).strip()


def validate(data):
    families = {f['id']: f for f in data['families']}
    subjects = {s['id']: s for s in data['subjects']}
    papers = data['papers']
    assert len(families) == data['counts']['families'], 'Family count mismatch'
    assert len(papers) == data['counts']['papers'], 'Paper count mismatch'
    assert len({p['id'] for p in papers}) == len(papers), 'Duplicate manuscript IDs'
    assert sum(p['lean'] for p in papers) == data['counts']['lean'], 'Lean count mismatch'
    for f in families.values():
        assert f['subject'] in subjects and f['description']
        assert any(p['family'] == f['id'] for p in papers), f'Empty family {f["id"]}'
    for p in papers:
        assert p['family'] in families and p['subject'] == families[p['family']]['subject']
        assert p['abstract'] and p['bibtex'].startswith('@') and p['title']
        assert re.fullmatch(r'\d{4}-\d{2}-\d{2}', p['date']), p['id']
        assert p['path'].startswith('preprints/') and p['path'].endswith('.pdf')
    print(f"Validated: {len(papers)} manuscripts, {len(families)} families, {len(subjects)} subjects, {data['counts']['lean']} Lean entries.", flush=True)


def sync():
    commit = json.loads(fetch('https://api.github.com/repos/openai/math/commits/main'))
    sha = commit['sha']
    print(f'Syncing openai/math @ {sha[:12]}', flush=True)
    sources = ['CONTENTS.md', 'overview.tex', 'lean/formalization.yaml', 'README.md', 'LICENSE']
    with ThreadPoolExecutor(max_workers=5) as pool:
        raw = dict(zip(sources, pool.map(lambda p: cached(sha, p), sources)))
    subjects, family_subject = [], {}
    section = None
    for match in re.finditer(r'\\cataloguesection\{([^}]+)\}\{\d+\}|\\resultentry\{(\d+)\}', raw['overview.tex']):
        if match[1]:
            name = match[1]
            if name not in SUBJECTS:
                raise ValueError(f'Add a Chinese label for new upstream subject: {name}')
            zh, description, hue = SUBJECTS[name]
            section = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')
            subjects.append({'id': section, 'name': name, 'zh': zh, 'description': description, 'hue': hue})
        else:
            assert section, 'Family without a discipline'
            family_subject[match[2]] = section
    lean_paths = set(re.findall(r'^\s+id:\s*\.\./(preprints/[^\n]+)', raw['lean/formalization.yaml'], re.M))
    traces = dict(re.findall(r'\|\s*(\d{3})\s*\|\s*\[[^\]]+\]\((reasoning_traces/[^)]+)\)', raw['README.md']))
    families, papers = [], []
    family = None
    for cell in re.findall(r'<td>\s*(.*?)\s*</td>', raw['CONTENTS.md'], re.S):
        fm = re.match(r'\*\*(\d+)\.\s+(.*?)\*\*\s*(.*)', cell, re.S)
        if fm:
            ident, title, description = fm.groups()
            lean_doc = re.search(r'\(\[Lean\]\(([^)]+)\)\)', description)
            description = re.sub(r'\s*\(\[Lean\]\([^)]+\)\)', '', description)
            family = {'id': ident, 'title': normalize(title.rstrip('.')), 'description': normalize(description),
                      'subject': family_subject[ident], 'leanPath': lean_doc[1] if lean_doc else None,
                      'tracePath': traces.get(ident)}
            families.append(family)
            continue
        pm = re.match(r'&emsp;\[(.*?)\]\((preprints/[^\n]+?\.pdf)\)\s*(.*)', cell, re.S)
        if not pm:
            raise ValueError(f'Unrecognized catalogue cell: {cell[:180]}')
        title, path, abstract = pm.groups()
        ident = path.split('/')[1]
        dm = re.search(r'-(\w+)-(\d{1,2})-(\d{4})$', ident)
        date = datetime.strptime(' '.join(dm.groups()), '%B %d %Y').date().isoformat() if dm else None
        papers.append({'id': ident, 'title': normalize(title), 'abstract': normalize(abstract), 'path': path,
                       'family': family['id'], 'subject': family['subject'], 'date': date, 'lean': path in lean_paths})
    expected = re.search(r'\*\*(\d+) manuscripts covering (\d+) result families', raw['CONTENTS.md'])
    assert expected, 'Upstream count header changed'
    assert len(papers) == int(expected[1]) and len(families) == int(expected[2])
    assert lean_paths <= {p['path'] for p in papers}, 'Unmapped formalization sources'
    print(f'Fetching original BibTeX for {len(papers)} manuscripts (cached on subsequent runs)...', flush=True)

    def citation(paper):
        readme = cached(sha, f'preprints/{paper["id"]}/README.md')
        match = re.search(r'(```|~~~)bibtex\s*(.*?)\s*\1', readme, re.S)
        if not match:
            raise ValueError(f'No original BibTeX for {paper["id"]}')
        paper['bibtex'] = match[2]
        date_match = re.search(r'\*\*Date:\*\*\s*([^\n]+)', readme)
        if date_match:
            for fmt in ('%B %d, %Y', '%d %B %Y', '%Y-%m-%d'):
                try:
                    paper['date'] = datetime.strptime(date_match[1].strip(), fmt).date().isoformat()
                    break
                except ValueError:
                    continue
            else:
                raise ValueError(f'Unrecognized README date: {date_match[1]}')
        if not paper['date']:
            raise ValueError(f'No original date for {paper["id"]}')

    with ThreadPoolExecutor(max_workers=12) as pool:
        jobs = [pool.submit(citation, p) for p in papers]
        for n, job in enumerate(as_completed(jobs), 1):
            job.result()
            if n % 100 == 0:
                print(f'  {n}/{len(papers)} citations', flush=True)
    for subject in subjects:
        members = [p for p in papers if p['subject'] == subject['id']]
        subject.update(papers=len(members), families=len({p['family'] for p in members}), lean=sum(p['lean'] for p in members))
    data = {'schemaVersion': 1, 'repository': REPO, 'commit': sha, 'commitDate': commit['commit']['committer']['date'],
            'syncedAt': datetime.now(timezone.utc).isoformat(),
            'counts': {'papers': int(expected[1]), 'families': int(expected[2]), 'lean': len(lean_paths), 'subjects': len(subjects)},
            'subjects': subjects, 'families': families, 'papers': papers}
    validate(data)
    DEST.mkdir(parents=True, exist_ok=True)
    # Publish only a complete, internally consistent snapshot.
    temp = DEST / 'catalog.json.tmp'
    temp.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    temp.replace(DEST / 'catalog.json')
    (DEST / 'UPSTREAM-LICENSE.txt').write_text(raw['LICENSE'], encoding='utf-8')
    print(f'Written {DEST / "catalog.json"}', flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate the existing snapshot without network requests')
    args = parser.parse_args()
    if args.check:
        validate(json.loads((DEST / 'catalog.json').read_text(encoding='utf-8')))
    else:
        sync()
