# dsh 插件化深度解析 —— 一切皆插件是如何运转的

> 面向 AI 应用开发者的底层原理讲解 · 基于 deepseek-harness v0.1.1-rc.2 (b150a55) 源码 · 系列第二篇
>
> 本文是「dsh 构建细节与大模型知识」系列第二篇。第一篇见 [dsh 图像管线深度解析](dsh-image-pipeline-wiki.md)。

---

## 目录

1. [为什么 dsh 选择「一切皆插件」](#一为什么-dsh-选择一切皆插件)
2. [Cordis 五件事：插件框架的内核](#二cordis-五件事插件框架的内核)
3. [一个插件的真实形态](#三一个插件的真实形态)
4. [Loader 与 cordis.yml：应用如何被组合](#四loader-与-cordisyaml应用如何被组合)
5. [运行时的形状：从单个插件到插件树](#五运行时的形状从单个插件到插件树)
6. [Profiles / Bundles / Layers：可分发、可叠加的插件化](#六profiles--bundles--layers可分发可叠加的插件化)
7. [能力缝（capability seam）：一次替换改变整个产品](#七能力缝capability-seam一次替换改变整个产品)
8. [热重载（HMR）：改代码不重启](#八热重载hmr改代码不重启)
9. [与其它插件模型的差异（概念对照）](#九与其它插件模型的差异概念对照)
10. [实践建议](#十实践建议)
11. [术语速查](#十一术语速查)

---

## 一、为什么 dsh 选择「一切皆插件」

先建立一个最重要的认知：**dsh 没有需要打补丁的「特权核心」。模型适配器、工具注册表、会话日志、甚至 agent loop 本身，全部都是插件。**

```
传统单体应用                         dsh
─────────────────────────          ─────────────────────────
app.boot() {                        root Context
  initConfig()                         │
  initDB()                             ▼
  initTools()          ──对比──▶       Loader 读取 cordis.yml
  initModelAdapter()                     │ 挂载每一个插件行
  initAgentLoop()                        ▼
  ...永远要改这里才能加功能          每一个贡献都作为「插件」挂在 ctx 上
}                                    想加能力 = 在旁边再挂一个插件
                                      卸载它 = 它的所有贡献自动回卷
```

`architecture.md` 里把这句话说得很直白：

> 没有需要打补丁的特权核心：你通过在其它插件旁边挂一个插件来扩展 dsh，而注册都是 effect，会在所属插件卸载时回卷。

这意味着三件事：

- **可替换性来自配置，而非分叉**——换一个 LLM 适配器、换一个 shell 执行世界、换一个 subagent 实现，都只是换一棵插件树里的几行，不需要 fork 源码。
- **能力有统一生命周期**——任何贡献（工具、事件监听、服务、适配器）都走同一条「加载即注册、卸载即撤销」的路径。
- **组合是可声明的**——应用长什么样，由一份分层叠加的配置决定，而不是由 `boot()` 里的调用顺序决定。

理解后面所有内容，只要抓住一句话：**运行中的 dsh 是一棵在 boot 时由有序层组合出来的插件树。**

---

## 二、Cordis 五件事：插件框架的内核

`docs/cordis-primer.md` 把 Cordis（dsh 底层那套被 vendored 的插件框架）归纳成五件事。这是全文的基石。

### 2.1 一个插件是「实现了 Service 的对象」

它可以是三种形态之一：

```ts
import { Service, type Context } from '@deepseek-ai/cordis'

// 1. 函数插件（最常见）：可选 name / inject，必须有 apply(ctx)
export const name = 'hello'
export function apply(ctx: Context) {
  console.log('hello from my first plugin')
}

// 2. 对象插件：带 apply 方法的对象
export const objectPlugin = { name: 'object-plugin', apply(ctx: Context) {} }

// 3. 类插件：Service 的子类（需要公开服务时用，见第三章）
export class MyService extends Service {
  constructor(ctx: Context) { super(ctx, 'myTutorialService') }
}
```

在你需要公开服务之前，请一直用函数形态。来源：`docs/cordis-tutorial/01-first-plugin.zh.md`。

### 2.2 上下文是「服务的仓库」

一个服务从上下文里认领一个稳定的 `ctx.<key>`，比如 `ctx.tools`、`ctx.llm`、`ctx.sessions`；其它插件通过 **key** 而不是 import 某个具体实现来找到它。

```
插件 A 认领 ctx.tools  ─┐
                        ├─▶ 共享的 Context 仓库
插件 B 认领 ctx.llm   ─┘        ↑
                                  │ 通过 key 取用，不 import 实现
                          插件 C 调用 ctx.tools / ctx.llm
```

### 2.3 用 `inject` 声明依赖

一个插件若 `inject: ['timer']`，它会一直等到 `timer` 服务出现才加载。于是**加载顺序由服务依赖表达，而不是手写 boot 时序**。这正是 2.2 那句「通过 key 找服务」的另一面：找不到就等，不报错、不崩溃。

### 2.4 类型化事件做通信

服务通过 TypeScript 声明合并（declaration merging）声明事件名，再以四种模式分发：

| 模式 | 等待？ | 触发顺序 | 有返回值？ | 典型用途 |
|---|---|---|---|---|
| `emit` | 否 | 按注册顺序观察 | 否 | 广播事实 |
| `waterfall` | 否 | 按注册顺序观察 | 是 | 中间件式改写/拦截 |
| `parallel` | 是 | 全部并发观察 | 否 | 并发副作用 |
| `serial` | 是 | 按注册顺序 | 是 | 有序决策 |

`ctx.waterfall` 是 around 中间件：监听器拿到 `(...args, next)`，调用 `next()` 把（可能被包装过的）结果往下传；**不调用 `next()` 就是短路**。单决策事件里短路是设计本身（策略监听器直接 own 决策）；只做标注的监听器必须 `next()`。`architecture.md` 与 `packages/AGENTS.md` 都强调：**waterfall 监听器必须调用 `next()`，否则会截断整条链。**

### 2.5 注册是可逆的 effect

工具 schema、prompt 段落、适配器、provider、事件监听，全部通过 `ctx.effect()` 或 `ctx.on()` 安装，于是**热重载和拆除都能可预测地回卷**。你很少需要亲手写 `ctx.effect()`，因为内置注册 API 本身已经是 effect：`ctx.on(event, listener)` 卸载时移除；`ctx.plugin(child)` 随父插件一起 dispose；`ctx.tools.register(...)` 这类 harness 注册表也会把返回的 disposer 挂在调用插件上自动撤销。

---

## 三、一个插件的真实形态

把五件事落到一份可运行的骨架。

### 3.1 函数插件（贡献行为，不公开服务）

```ts
import type { Context } from '@deepseek-ai/cordis'

export const name = 'lifecycle-demo'

export function apply(ctx: Context) {
  // 任何 Cordis 没管的资源（定时器/连接/watcher）都包进 effect，并返回释放函数
  ctx.effect(() => {
    const timer = setInterval(() => console.log('tick'), 200)
    return () => {            // 卸载时运行
      clearInterval(timer)
      console.log('cleaned up')
    }
  })
}
```

要点（`docs/cordis-tutorial/02-lifecycle-and-effects.zh.md`）：

- effect 主体在加载期运行，返回的 disposer 在卸载期运行；
- 对于生命周期与插件一致的资源，你绝不需要自己调 disposer；
- `ctx.plugin(child)` 会返回一个 **fiber**（已加载插件实例的运行时句柄），`fiber.dispose()` 会等它的全部清理（含异步）完成后，再递归卸载它挂的所有子插件。

### 3.2 服务插件（公开一个 `ctx.<key>`）

```ts
import { Service, type Context } from '@deepseek-ai/cordis'

export class MyService extends Service {
  constructor(ctx: Context) { super(ctx, 'myService') }
  doWork() { /* ... */ }
}
// 其它插件写 inject: ['myService']，然后通过 ctx.myService.doWork() 调用
```

类插件把能力挂上 `ctx` 的某个 key，让别的插件按 key 依赖它——这就是 2.2/2.3 的组合闭环。

### 3.3 双形态陷阱（来自 dsh-hub 的踩坑记录）

`dsh-hub/AGENTS.md` 特别点出：**服务包默认导出它的类；函数插件用命名导出 `name` / `inject` / `Config` / `apply`，且不要有默认导出。** 把两者混用，Loader 会丢掉函数插件的命名空间。注册都是 effect：`ctx.effect()`、`ctx.on()`（含 waterfall 监听）——卸载插件 fiber 会把它们全部反注册。

---

## 四、Loader 与 cordis.yml：应用如何被组合

Cordis 不是让你在代码里 `import` 插件并调用，而是让你**描述**一份插件清单，由 Loader 去挂载。

```yaml
# cordis.yml —— 一组 Cordis 配置项的列表
- id: logger
  name: '@deepseek-ai/cordis-plugin-logger-console'
- id: hello
  name: './hello.ts'        # 相对路径或 npm 包名都行
- id: heavy
  name: './heavy.ts'
  disabled: true            # 保留配置项但不挂载；改回 false 即重新加载
```

`docs/cordis-tutorial/01-first-plugin.zh.md` 解释了几件事：

- `name` 是模块指定符（相对路径或包名），Loader 挂载每一项；
- **各项并发启动**，所以它们在列表里的位置不保证加载先后——顺序由服务依赖（`inject`）决定；
- 一个配置项不只有 `name`/`config`，还接受 `id`（稳定标识，让 Loader 能区分「改现有项」与「先删再加」）和 `disabled`。

`docs/cordis-primer.md` 的「Loader Configuration」补充了配置注入细节：loader 用 `@deepseek-ai/cordis-plugin-include` 把 `!!js` 解析成表达式节点；它会插值在配置项声明注入**激活后**、`config` 字段上（对该插件上下文 `ctx.serviceName`）以及每次挂载决策时、`disabled` 字段上（对 loader 上下文）进行。其它元数据保持字面量。**当环境要挑选插件时，用 overlay（叠加层）而不是条件分支。**

> **`cordis.yml` 与 `cordis.patch.yml` 是同一种行列表的两种用途**：前者是独立应用的 loader 入口清单（教程里那种）；后者作为「层」被叠加进一个 profile，按 `id` 插入新行或整体替换某一行的 `config`。本文第六章的 bundle patch 用的就是后者。

---

## 五、运行时的形状：从单个插件到插件树

把 2~4 拼起来，运行时是这样一棵东西：

```
┌──────────────────────────────────────────────────────────┐
│ 根 Context（服务仓库：ctx.tools / ctx.llm / ctx.sessions …）│
│                                                            │
│   ├─ Loader 插件（读取 cordis.yml，挂载下面每一项）        │
│   │                                                        │
│   ├─ fiber: hello        ACTIVE                           │
│   │     └─ (apply 里 ctx.plugin(child) → 子 fiber)        │
│   │                                                        │
│   ├─ fiber: lifecycle-demo  ACTIVE                        │
│   │     └─ effect: setInterval(tick)  ← 卸载时 clearInterval│
│   │                                                        │
│   └─ fiber: needs-timer   PENDING ⚠ 需要的 timer 还没来   │
└──────────────────────────────────────────────────────────┘
```

每个已加载的插件实例都有一个 **fiber**，在以下状态间转换（`docs/cordis-tutorial/02-lifecycle-and-effects.zh.md`）：

```
PENDING → LOADING → ACTIVE → UNLOADING → DISPOSED
               ↘ FAILED
```

- **PENDING**：已声明，但所需服务尚不可用——这是「我的插件怎么没输出」最常见的答案；
- **LOADING / ACTIVE**：`apply` 正在跑 / 已跑完；
- **FAILED**：`apply` 或配置校验抛异常；
- **UNLOADING / DISPOSED**：disposer 正在跑 / 全部拆完。

**依赖缺失是静默的，不是错误。** 如果 `inject` 指定了没人提供的服务，插件就一直 PENDING，不输出任何东西。诊断方法（`docs/cordis-tutorial/06-composition-and-hmr.zh.md`）是枚举注册表、打印处于 `PENDING` 的 fiber：

```ts
import { FiberState, type Context } from '@deepseek-ai/cordis'
export function apply(ctx: Context) {
  setTimeout(() => {
    for (const runtime of ctx.registry.values())
      for (const fiber of runtime.fibers)
        if (fiber.state === FiberState.PENDING)
          console.log(`${fiber.name} is PENDING — a required service is missing`)
  }, 500)
}
```

---

## 六、Profiles / Bundles / Layers：可分发、可叠加的插件化

单个 `cordis.yml` 只是玩具。真实 dsh 把「插件清单」升级成三层概念（`docs/architecture.md` 的 Profiles and bundles）：

> 运行中的 dsh 是一棵在 boot 时由**有序层（ordered layers）**组合出来的插件树。

### 6.1 三个概念

- **Profile（配置方案）**：存放在 Harness home 里的一份**命名组合**。它列出要堆叠的 bundles、收纳它额外安装的 out-of-tree 插件、并持有用户自己的 `cordis.patch.yml`。`web` 和 `headless` 作为模板随产物发布。
- **Bundle（插件包）**：Cordis 配置行 + 它们挂载的代码的**发行格式**。关键性质——它插入的内容仍能被它**上面的层** patch，所以任何 bundle 都不是黑盒。
- **Layer（层）**：叠加的顺序单位。每个 bundle、用户的 patch、home 级 patch、`--patch` overlay 各自是一层。

三者怎么声明？各自在 `package.json` 里用 `dsh` 字段自报家门：`dsh.profile` 列出一个 profile 包含的 bundles；`dsh.bundle` 指向该 bundle 的 patch 文件。

### 6.2 层是怎么叠加的

层按顺序作用在一个**空的入口列表**上：

```
空入口列表
   │  ① 按 profile 列出的顺序，逐个 bundle 的 cordis.patch.yml
   │  ② profile 自己的 cordis.patch.yml
   │  ③ home 级 cordis.patch.yml
   │  ④ 任何 --patch overlay
   ▼
最终插件树（每一层按 id 定位某一行）
```

两条规则（`docs/architecture.md` + `packages/bundle/base/cordis.patch.yml` 注释）：

- **patch 按 `id` 定位某一行，替换的是该行「整个 `config`」**，而不是 merge 进去——所以「同一行在不同模式下值不同」不该塞进 base，而该属于各模式 bundle；
- **同一行多个层都写，以最后写入者胜（last write wins per row）**。

`dsh-base` 是**每一个** profile 的第一层（模型适配器、工具、持久化、sandbox、审批策略、设置、凭据、遥测）；`dsh-web-app` 加上浏览器应用；`dsh-headless` 加上「一次性运行、完全不带服务器」的模式。想看你这台机器真正 boot 出来的树：

```sh
dsh --profile web --dump-config
```

它打印的每一行，你都能用自己的 patch 替换掉。

### 6.3 一份真实的 bundle patch

`packages/bundle/base/cordis.patch.yml` 长这样（节选）：

```yaml
# dsh-base：每个 profile 共享核心，作为「对空 profile 根的一次 insert」施加。
# 后续 bundle patch 与用户 profile 的 cordis.patch.yml 按 id 定位这些行，
# 同一行以最后写入者胜。
- insert:
    - id: timer
      name: '@deepseek-ai/cordis-plugin-timer'
    - id: hmr
      name: '@deepseek-ai/cordis-plugin-hmr'
      config:
        root: ['.']
    - id: llm
      name: '@deepseek-ai/dsh-llm'
    - id: session
      name: '@deepseek-ai/dsh-session'
    - id: typert
      name: '@deepseek-ai/dsh-typert-registry'
    # …… web / headless 等模式 bundle 再在这些 id 上 restate 自己的完整 config
```

注意 `id` 是全局的（跨整个 profile）。dsh-hub 的 `AGENTS.md` 建议：用能力风格的前缀（如 `my-bash-sandbox`）给每行起稳定的 id，方便后续 patch 精准命中。

### 6.4 用户怎么装一个插件（面向 dsh-hub）

在 dsh-hub 这套指针仓库里，装一个第三方插件走的是 `dsh plugin add`（`dsh-hub/AGENTS.md` 的插件规约）：

```sh
dsh plugin add github:<owner>/<repo>     # GitHub：需 prepare 从源码构建 lib/
dsh plugin add <npm-package>             # npm：要求发布时已构建好 lib/
dsh plugin add ./local/path              # 本地开发
```

一个能被 `dsh plugin add` 装上的仓库必须满足（非谈判项）：

- `package.json`：`type: "module"`、`main: "lib/index.js"`、`exports["."]`、声明 `dsh.bundle.patch: ./cordis.patch.yml`；`@deepseek-ai/cordis` 同时进 `peerDependencies` 与 `devDependencies`（否则会出现重复 Cordis 实例、ctx 坏掉）；`@deepseek-ai/schemastery` 进 `dependencies`；scripts 含 `build`/`prepare`/`typecheck`/`lint`；
- `cordis.patch.yml`：一个 `- insert:` 列表，每行有全局唯一的 `id`、`name`（从 profile 的 node_modules 解析）、`config`；
- `src/index.ts`：函数插件命名导出 `name`/`inject`/`Config`/`apply` 且无默认导出；服务包默认导出类。

验证是强制的：建一个临时 profile，对 github / npm / local 三条路径各跑一次 `dsh plugin --profile <tmp> add`，确认 `lib/` 经 `prepare` 构建、无 `dsh plugin` 警告、`dsh --dump-config` 显示该层已激活。

### 6.5 一个真实的「用户叠加」例子

假设 base 已经用 `id: llm` 插入了模型适配器。用户的 profile `cordis.patch.yml` 可以在它**之后**叠加，按同一个 `id` 改写配置，或新增 base 里没有的行：

```yaml
# 用户的 profile cordis.patch.yml（作用于 base 之后）
- insert:
    - id: llm
      name: '@deepseek-ai/dsh-llm'
      config:
        defaultProvider: deepseek-reasoner   # 整体替换 base 里 llm 的 config
    - id: my-bash-sandbox
      name: 'dsh-sandbox-my'                 # 新增一行，base 里没有
      config:
        network: isolated
```

因为「同一 `id` 以最后写入者胜」，这里的 `llm` 配置会盖掉 base 的那份；`my-bash-sandbox` 则是全新插入的一行。这就是 bundle 为什么说「插入的内容仍可被上层 patch」——它从设计上就不是黑盒。

---

## 七、能力缝（capability seam）：一次替换改变整个产品

`docs/architecture.md` 把 dsh 可替换性的真正引擎叫 **seam（能力缝）**：

> 一个 seam 是一个可替换的能力，有三个角色：声明接口的 **Service Definition**、实现它的 **Service Provider**、使用它的 **Consumer**（通常是面向模型的工具）。一个包可以合演多角，但**只有一角是构不成 seam 的**；加一个能力意味着三个角色都设计出来。

```
   Service Definition ──┐
                        ├──▶  capability seam（可替换能力）
   Service Provider  ───┤      换 Provider = 换整片行为
                        │
   Consumer         ───┘
```

三者构成一个完整、可替换的能力单元；缺任何一角都不叫 seam。缝之所以强大，是因为「换一个 provider 就换了整个产品」：

- 文件系统与子进程的 provider 共享**同一个执行世界**，所以把这两者指向一个远程 sandbox，Bash、PTY、LSP 会**一起**被搬过去，无需各自分叉 provider；
- subagent 的 provider 在同一个接口后面差异极大——从「一个全新的子 agent」到「另一个产品里被委派的一轮」，可以无缝换。

`architecture.md` 还列了一张「新行为去哪」的表（节选），几乎覆盖了所有扩展点：

| 目标 | 机制 |
|---|---|
| 加一个模型 provider | 在 `ctx.llm` 上注册它的适配器 |
| 加一个面向模型的能力 | 在 `ctx.tools` 注册；它的 schema 会并入 prompt 组装 |
| 加文件系统访问或策略 | 注册一个 `ctx.fs` provider，或监听 `fs/*` 事件 |
| 让某会话用不同的能力集 | 组合一个 agent preset；那一行服务需要 `isolate` 一个 realm |
| 加 shell 执行 | 注册一个 `ctx.shell` 后端；本地实现经 `ctx.subprocess` 拉起 |
| 加持久终端 | 注册一个 `ctx.terminals` 后端 + `dsh-tool-terminal` |
| 加人类命令 | 注册到 `ctx.commands`；它不走模型轮次直接分发 |
| 加后台工作 | 注册到 `ctx.jobs`；`job_*` 工具收集或停止它 |
| 拦截一次请求/工具/轮次 | 用它的 `agent/*` 或 `tools/*` 事件；`agent/turn-stopping` 能停下整轮 |
| 加面向模型的上下文 | 调 `agent.inject()`；它落到下一个被接纳的请求里 |
| fork 一个活跃会话 | `ctx.sessions.fork(source, boundary?, childSessionId?)` |
| 把注册限定在某个 agent | 用那个 agent 的 `agent.ctx` |

关于上表中的 `isolate`：它给一个组提供某项服务名称的**独立实例**，于是两个组可以各自看到配置不同的 provider，互不影响（`docs/cordis-tutorial/06-composition-and-hmr.zh.md`）。agent preset 用它是为了让「某个会话」拥有不同于全局的能力集，而不污染其它会话。

---

## 八、热重载（HMR）：改代码不重启

`@deepseek-ai/cordis-plugin-hmr` 监视文件，保存时执行「先卸载、再加载」来替换正在跑的插件（`docs/cordis-tutorial/06-composition-and-hmr.zh.md`）。

```yaml
- id: hmr
  name: '@deepseek-ai/cordis-plugin-hmr'
  config:
    root: ['.']
- id: hello
  name: './hello.ts'
```

编辑 `hello.ts` 保存后：

```
hello from my first plugin
hmr reload plugin at hello.ts
hello from my EDITED plugin
```

旧实例先卸载（它的所有 effect 回卷），新代码随后加载，`apply` 再跑一遍。这件事成立的前提，正是前文两点：**注册是可逆的 effect**（卸载能干净拆掉），以及**加载是依赖驱动的**（重新加载后依赖关系重新满足）。

`id` 在这里也很关键：不带 `id` 的配置项每次被读取都会获得一个新生成的 id，于是只要配置文件有任何编辑——哪怕那一行文本没变——它也会被视为「先删再加」并重新挂载。这就是为什么 cordis 配置项要显式带 `id`。

编辑 `cordis.yml` 本身也会触发更新：loader 按 `id` 比较配置项，只挂载/卸载/重配置发生变化的部分。

---

## 九、与其它插件模型的差异（概念对照）

下面这张表是**概念层对照**，用来快速定位 dsh/Cordis 的站位，而非对某家源码的逐行研读。

| 维度 | dsh / Cordis | 传统手动 boot 顺序 | 事件总线型插件 | 依赖注入容器 |
|---|---|---|---|---|
| 加载顺序 | 依赖驱动：`inject` 缺服务就 PENDING | 代码里写死 `initA(); initB()` | 注册即生效，顺序靠运气 | 构造期按图实例化 |
| 依赖解析 | 按 `ctx.<key>` 服务名，找不到就等 | 直接 import 具体类 | 通常无强依赖 | 按类型自动装配 |
| 注册生命周期 | effect 可逆，卸载即回卷 | 常忘记反注册，泄漏 | 需手动 off，易漏 | 按作用域销毁 |
| 配置叠加 | 分层 patch，按 id last-write-wins | 一处 if/else | 各自读配置 | profile/override |
| 热更新 | HMR 卸载+加载，天然成立 | 基本要重启 | 难，监听要重建 | 部分支持 |
| 扩展性边界 | 「挂一个插件」而非「改核心」 | 改核心代码 | 挂监听但难换核心 | 换实现但核心固定 |

dsh 的四个鲜明特点：**声明式分层 patch、依赖驱动的 PENDING、effect 可逆、类型化事件**。前两者保证「组合可声明、缺失可诊断」，后两者保证「替换可预测、热更新可行」。

---

## 十、实践建议

**给插件开发者：**

1. 默认用**函数形态**；只有要公开 `ctx.<key>` 时才上 Service 子类。服务包默认导出类、函数插件命名导出 `name/inject/Config/apply` 且无默认导出——两者别混。
2. 任何 Cordis 没管的资源（定时器、连接、watcher）都包进 `ctx.effect()` 并返回 disposer；内置注册 API 本身已是 effect，别重复造。
3. 部署会变的选择放进可校验的 `Config` 字段（走 cordis.yml 改），**别在插件里硬编码 tunables**（`packages/AGENTS.md` 的硬规矩）。
4. 配置项务必带稳定 `id`；否则任何编辑都会触发「删了重加」。

**给架构师：**

1. 想做**可分发**的插件化，用 bundle（配置行 + 代码）而不是把逻辑写进某个 profile；bundle 插入的行仍可被上层 patch，所以它是开放的而不是黑盒。
2. 想做**可替换**的能力，用 seam 的三角色（Definition / Provider / Consumer）来设计，而不是在 loop 里加 if。换一个 provider 就能换掉整片行为。
3. 跨 bundle 共享配置时记住：patch 按 id **整体替换** config，不是 merge；模式相关的值交给各模式 bundle 各自 restate。

**给排查者：**

1. 插件「没输出、不报错」——先查它的 fiber 是不是 `PENDING`（缺某个 `inject` 的服务）。
2. 改了插件代码想立刻生效——确认 HMR 插件在跑，且你的包带 `id`。
3. 想知道最终 boot 出什么——`dsh --profile <name> --dump-config`，它打印的每一行都能被你自己的 patch 替换。

---

## 十一、术语速查

| 术语 | 含义 |
|---|---|
| 插件（plugin） | 向共享 Context 贡献服务/事件/可逆 effect 的对象；函数、对象、Service 子类三种形态 |
| 服务（service） | 认领一个稳定 `ctx.<key>` 的能力单元；其它插件按 key 而非 import 找它 |
| 上下文（Context） | 服务仓库；`ctx.tools` / `ctx.llm` / `ctx.sessions` 等都在其上 |
| `inject` | 插件声明所需服务；缺失时插件进入 PENDING，不报错 |
| effect | 通过 `ctx.effect()`/`ctx.on()` 安装的注册；插件卸载时自动回卷 |
| fiber | 一个已加载插件实例的运行时句柄；有 PENDING→ACTIVE→…→DISPOSED 状态机 |
| Profile | Harness home 里的命名组合：列 bundles、收纳 out-of-tree 插件、持用户 patch |
| Bundle | Cordis 配置行 + 挂载代码的发行格式；插入内容仍可被上层 patch |
| Layer | 叠加顺序单位；顺序为 bundle→profile patch→home patch→`--patch` overlay |
| patch（按 id） | 定位某一行，整体替换其 `config` 或插入新行；同 id 以最后写入者胜 |
| seam（能力缝） | 可替换能力，含 Definition/Provider/Consumer 三角色，缺一不构成 seam |
| waterfall | around 中间件式事件；监听器须调 `next()` 否则短路 |
| HMR | 热模块替换：保存文件时卸载+加载该插件，因 effect 可逆而成立 |

---

*基于 deepseek-harness v0.1.1-rc.2 (b150a55) 源码（`docs/cordis-primer.md`、`docs/architecture.md`、`docs/cordis-tutorial/*`、`packages/bundle/base/cordis.patch.yml`、`packages/AGENTS.md`）与 `dsh-hub/AGENTS.md` 撰写 · 2026-08-26 · dsh-hub 项目 · 系列第三篇预告：agent loop 的内部构造*
