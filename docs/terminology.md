# 专业术语

术语来源为用户指定的 `tools/math-translator/dictionaries/merged.json`。选用词条、原始释义、复合词处理说明及原文件 SHA-256 保存在 [data/terminology.json](../data/terminology.json)，站点学科名称和简介由这份表生成。

词典的同义词或可选的“学”字按当前语境选取，不将整条释义直接塞入界面。未收录的完整术语不能因为英文相似就套用另一个词条。

| 英文 | 页面采用 | 依据 |
| --- | --- | --- |
| smooth dynamical systems | 光滑动力系统 | `smooth dynamical system` 的原释义即“光滑动力系统”；页面使用这一明确词组，`smooth dynamics` 没有独立词条 |
| combinatorics | 组合学 | 词典原释义 |
| ergodic theory | 遍历理论 | 词典原释义 |
| profinite groups | 投射有限群 | `profinite group` 的原释义 |
| von Neumann algebras | 冯·诺伊曼代数 | `von Neumann algebra` 的主释义 |
| algebraic and complex geometry | 代数几何与复几何 | 分别采用 `algebraic geometry` 和 `complex geometry`，不将前者缩成“代数” |
| several complex variables | 多复变量 | 词典原释义，不擅自添加“函数” |
| additive combinatorics | 加性组合学 | 用 `additive` 与 `combinatorics` 的相应义项组成 |
| metric embeddings | 度量嵌入 | 用 `metric` 与 `embedding` 组成，不能套用“等距嵌入” |
| Artin groups | Artin 群 | 保留未收录专名；`Artinian group` 与它是不同概念 |
| hardness of approximation | 保留英文 | 完整术语未收录，避免跨语境套用“逼近” |
| spin glasses | 保留英文 | 完整术语未收录，等待补充核定译名 |

以下词典格式问题已记录，页面不沿用损坏或错误的部分：

- `L-function` 的释义与 `L²-function` 粘连；采用数学符号 L 加 `function` 的“函数”。
- `moduli space (` 的键和值在括号处断开；恢复为“（参）模空间”，页面采用“模空间”。
- `partial differential equation (=ODE)` 中的英文别名误注为 ODE；页面采用正确的 `Partial differential equations` 与“偏微分方程”，不传播误注。

论文标题、摘要、成果描述仍保持上游英文原文。本次术语核对范围是界面中的学科名称与主题简介。
