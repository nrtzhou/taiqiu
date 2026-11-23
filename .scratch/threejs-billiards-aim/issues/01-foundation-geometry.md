# 01: 工程地基与瞄准几何核心

**What to build:** 用 Vite + pnpm + three 建立可构建的中文页面骨架；实现不 import three 的瞄准几何核心（台面/球半径常量、6 个袋口、单袋可行性评估、最小切角选袋、随机合法局面）；用 node:test 锁定几何不变量；生成并提交 pnpm-lock.yaml。完成后，测试与构建可在干净 worktree 通过，几何结论可被后续场景与交互直接复用。

**Blocked by:** None

**Status:** ready-for-agent

## Acceptance criteria

- [ ] `pnpm install` 成功并生成 `pnpm-lock.yaml`（该文件随候选提交；`.gitignore` 忽略 `node_modules` 与 `dist`）。
- [ ] `package.json` 提供 dev/build/test 脚本；`pnpm test` 为 `node --test`，只依赖 Node 内置模块。
- [ ] 纯几何模块不 import three，导出 spec 约定的常量、袋口规格、`evaluatePocket`、`createShot`、`randomShot`；输入输出与 spec 的 Decisions 一致。
- [ ] 测试覆盖 spec Testing Decisions 的 7 组不变量，`pnpm test` 全绿。
- [ ] 页面骨架显示中文标题，`pnpm build` 实际通过（确认 pnpm 10 未拦截构建）。
- [ ] 无 TODO、无占位实现、无未使用导出。

## Verification

- 依次执行 `pnpm install`、`pnpm test`、`pnpm build`，报告实际命令与结果。
- 在无 node_modules 的临时副本中执行 `node --test`，确认测试只依赖 Node 内置模块。

## Skills

- `tdd`：先写几何不变量测试，再实现。
- `ponytail`：只实现 spec 明确需要的 API，不加配置项与抽象。

## Out of scope

- 3D 场景、球桌/球/贴图、相机、OrbitControls、按钮交互。
- README 的完整操作说明（由最后一票收口）。
