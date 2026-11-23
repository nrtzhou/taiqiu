# 01: 工程地基与瞄准几何核心

**What to build:** 用 Vite + pnpm + three 建立可构建的中文页面骨架；实现不 import three 的瞄准几何核心（台面/球半径常量、6 个袋口、单袋可行性评估、最小切角选袋、随机合法局面）；用 node:test 锁定几何不变量；生成并提交 pnpm-lock.yaml。完成后，测试与构建可在干净 worktree 通过，几何结论可被后续场景与交互直接复用。

**Blocked by:** None

**Status:** done

## Acceptance criteria

- [ ] `pnpm install` 成功并生成 `pnpm-lock.yaml`（该文件随候选提交；`.gitignore` 忽略 `node_modules` 与 `dist`）。
- [ ] `package.json` 提供 dev/build/test 脚本；`pnpm test` 为 `node --test`，只依赖 Node 内置模块。
- [ ] 纯几何模块不 import three，导出 spec 约定的常量、袋口规格、`evaluatePocket`、`createShot`、`randomShot`；输入输出与 spec 的 Decisions 一致。
- [ ] 测试覆盖 spec Testing Decisions 的 7 组不变量，`pnpm test` 全绿。
- [ ] 页面骨架显示中文标题，`pnpm build` 实际通过（确认 pnpm 10 未拦截构建）。
- [ ] 无 TODO、无占位实现、无未使用导出。

## 补充约束（任务负责人修订，2026-11-23）

“合法可进球”还要求目标球的直线进袋路径不会先撞库边。几何模块需导出按袋型共享的袋口开口尺寸（角袋、中袋各一个 `mouthRadius`），后续渲染层直接复用来做袋洞与袋圈。

判定：取线段 T→P 首次穿出“球心可行矩形”（各轴向 `±(尺寸/2 − R)`）的交点 E，要求 `|E − P| ≤ 该袋 mouthRadius`；否则该袋不可行。

回归局面：`T=(0.90, −0.57)`、`C=(1.20, −0.54833)`。旧逻辑会以上中袋（切角 0°）为最优，但目标球在距袋口约 0.40 m 处已碰长库边；新逻辑必须判定上中袋、左上袋不可行，并选中左下袋（切角约 40.2°）。为此增加对应测试；本票验收清单不变。

## Verification

- 依次执行 `pnpm install`、`pnpm test`、`pnpm build`，报告实际命令与结果。
- 在无 node_modules 的临时副本中执行 `node --test`，确认测试只依赖 Node 内置模块。

## Skills

- `tdd`：先写几何不变量测试，再实现。
- `ponytail`：只实现 spec 明确需要的 API，不加配置项与抽象。

## Out of scope

- 3D 场景、球桌/球/贴图、相机、OrbitControls、按钮交互。
- README 的完整操作说明（由最后一票收口）。


## Status note

integrated 2bca1982a643d27ef2c35159a3092ab7cbe57a2f; task tree checks-only integration.