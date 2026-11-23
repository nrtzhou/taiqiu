# 04: 排除袋洞——随机摆球不得把球放进袋口

**What to build:** 修正有效台面判定：在矩形内缩 `R` 的基础上，扣除 6 个袋洞区域。球心到任一袋心距离 `< POCKETS[].mouthRadius + BALL_RADIUS` 时，视为整颗球进入袋洞，不允许作为母球、目标球或 ghost 的位置。`randomShot` 因此会拒绝该次采样并重采样；不得改 checks/seams/verify，不得新增依赖。

**Blocked by:** 03

**Status:** ready-for-agent

## Acceptance criteria

- [ ] 有效台面判定复用共享 `POCKETS[].mouthRadius`：球心到任一袋心距离 `< mouthRadius + BALL_RADIUS` 时不合法；母球、目标球、ghost 都使用该判定。
- [ ] `createShot({x:0,z:-0.599},{x:0,z:0})` 返回 `null`：母球在上中袋洞内，即使其它几何条件满足也不得生成局面。
- [ ] 固定随机序列回归：先用 `[0.5, 1/1200, 0.5, 0.5]`（会生成母球 `(0,-0.599)`、目标球 `(0,0)`），再接合法后备局面 `cue=(0.4,0.2)`、`target=(-0.4,-0.1)` 对应的采样值 `[0.6619433198380567, 0.6666666666666667, 0.33805668016194335, 0.41666666666666663]`；`randomShot` 必须丢弃首次尝试，返回后备局面，且母球、目标球、ghost 到全部 6 个袋心的距离均 `>= mouthRadius + R - 1e-9`。
- [ ] 随机不变量测试（至少 100 个种子）新增“母球、目标球、ghost 不在任何袋洞”；原有矩形内缩、不重叠、挡线、切角、选袋断言继续通过。
- [ ] `pnpm test`（至少 13 个测试）与 `pnpm build` 通过；不新增依赖，不改 `.matt.json`。

## Verification

- 执行 `pnpm test`、`pnpm build`。
- 固定序列在 `node:test` 中复现；本票不需要启动浏览器。

## Skills

- tdd

## Out of scope

- 视觉、UI、相机、材质改动。
- 母球或目标球运动路径穿过袋洞的连续碰撞判定；本票只修正初始球心与 ghost 的袋洞占用。
