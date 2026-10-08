# openaimath

OpenAI Math 中文阅读索引。

为 [openai/math](https://github.com/openai/math) 建立的独立中文网页映射，提供学科分类、成果系列导航与论文阅读功能。论文标题、摘要及系列说明保留官方英文原文。

在线阅读：**[https://foocker.github.io/openaimath/](https://foocker.github.io/openaimath/)**

当前数据快照包含 **722 篇手稿、372 个成果系列、17 个学科、162 篇主结果附 Lean 形式化的手稿**，对应上游提交 `adc7f1241b42e322a6451854ab7e4b4c146bf78a`。统计由源文件解析生成，没有手工补写论文或根据系列标签推断某篇论文已形式化。

## 启动

需要 Node.js 22 或更高版本。在本目录运行：

```powershell
npm install
npm run dev
```

访问 <http://127.0.0.1:5178/>。默认仅监听本机。

## 使用

- 首页按学科浏览；学科内可按成果系列或论文列表阅读。
- 搜索覆盖标题、摘要、系列描述、系列编号及中英文学科名。多词按 AND 匹配，双引号支持短语搜索；按 `/` 聚焦搜索框，`Esc` 清空。
- 支持仅看 Lean、日期排序、标题排序、摘要展开和原始 BibTeX 复制。
- 论文阅读页包括摘要、成果背景、相关论文，以及支持翻页、缩放和文字选择的 PDF 阅读器。
- 深浅主题、摘要字号会保存在当前浏览器；搜索和筛选条件保存在 URL，可分享或刷新恢复。
- 桌面、平板和手机均有对应排版。字体、KaTeX、PDF.js 均随站点构建，不依赖公共 CDN。

索引和摘要来自本地数据快照。PDF 只在点击“打开 PDF 阅读器”后从官方仓库按需获取，需要网络连接；读取失败时可重试或通过 GitHub 链接查看。PDF 阅读器呈现原始 PDF，不自动翻译论文，也不改写数学论证。

## 同步上游

同步需要 Python 3.10+，仅使用标准库，不需要 API 密钥：

```powershell
npm run sync
npm run build
```

同步先解析 `main` 对应的提交 SHA，再从同一提交读取所有源文件，避免版本混杂。已下载的原始文件按 SHA 缓存在 `.cache/`；全部解析与校验成功后才替换 `public/data/catalog.json`。源格式变化会明确报错，现有有效快照会保留。

| 上游文件 | 用途 |
| --- | --- |
| `overview.tex` | 学科与成果系列的对应关系 |
| `CONTENTS.md` | 成果描述、论文标题、摘要、PDF 路径与 Lean 说明链接 |
| `lean/formalization.yaml` | 按论文判断主结果是否具有形式化材料 |
| `README.md` | 推理摘要与成果系列的对应关系 |
| `preprints/*/README.md` | 原始 BibTeX 与论文日期 |
| `LICENSE` | 原始内容的 Apache-2.0 许可证 |

中文学科名称和简短学科介绍位于 `scripts/sync.py`。新增学科时，脚本会提示补充中文名称。官网说明各项结果处于不同验证阶段，界面保留了这一说明，Lean 徽标链接到其具体覆盖范围。

## 构建和部署

```powershell
npm run build
npm run preview
```

构建会先校验数据，再生成 `dist/`。本地生产预览地址为 <http://127.0.0.1:4178/>。

本站部署到 GitHub Pages，源码位于 `main` 分支，可直接发布的静态文件位于 `gh-pages` 分支。更新后运行：

```powershell
npm run deploy
```

该命令构建站点，将 `dist/` 的完整内容提交并推送到 `origin` 的 `gh-pages` 分支，保留该分支现有历史。发布使用本机 Git 的身份和 SSH / HTTPS 认证，不需要额外 API 密钥。临时发布目录与源码工作区隔离。

GitHub 仓库的 **Settings → Pages** 应配置为 **Deploy from a branch → gh-pages → / (root)**。GitHub 完成发布后，可访问 <https://foocker.github.io/openaimath/>。

资源采用相对路径，支持 GitHub Pages 的仓库子路径；页面通过查询参数路由，不需要服务器 rewrite 配置。`.nojekyll` 使 GitHub 直接发布构建产物。也可将 `dist/` 部署到其他静态托管服务。使用 HTTP 服务访问，不要直接双击 `index.html`。

示例路由：

```text
?                              首页
?view=all                      全部论文
?view=all&q=Riemann&lean=1      搜索并限定具有 Lean 形式化的论文
?subject=number-theory#f003     数论 / 成果系列 003
?paper=<上游论文目录名>         单篇论文阅读页
```

## 验证

```powershell
npm run check:data
npm run build
npm test
```

浏览器检查使用 Playwright，启动临时本地生产预览，完成后自动关闭。覆盖首页统计、搜索、空结果、精确 Lean 范围、公式排版、排序、分页、原始引用复制、在线 PDF 加载与翻页缩放、主题持久化、移动端溢出和无效链接。截图写入 `artifacts/`。

如果没有可用的 Chromium，先运行 `npx playwright install chromium`，或设置 `PLAYWRIGHT_CHROMIUM_EXECUTABLE` 指向现有 Chromium 可执行文件。PDF 检查需要访问 `raw.githubusercontent.com`。

## 文件结构

```text
index.html                  页面入口
src/main.js                 首页、学科、搜索与论文阅读界面
src/style.css               排版、主题、响应式样式
src/pdf-reader.js           按需加载的 PDF 阅读器
src/pdf-text-layer.css      PDF 文字选择层
scripts/sync.py             官方仓库同步和数据校验
scripts/deploy.mjs          构建产物发布到 GitHub Pages
scripts/smoke.mjs           浏览器端检查
public/data/catalog.json   完整的可追溯索引快照
public/data/UPSTREAM-LICENSE.txt
dist/                      生产构建产物
```

这是非官方阅读映射，页面注明了数学内容来源。数学内容及原始引用沿用上游许可证。
