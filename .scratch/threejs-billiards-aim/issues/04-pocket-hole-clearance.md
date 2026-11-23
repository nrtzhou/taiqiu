# 04: 排除袋洞——随机摆球不得把球放进袋口

**What to build:** 修正有效台面判定：在矩形内缩 `R` 的基础上，扣除 6 个袋洞区域。球心到任一袋心距离 `< POCKETS[].mouthRadius + BALL_RADIUS` 时，视为整颗球进入袋洞，不允许作为母球、目标球或 ghost 的位置。同时补上真正的母球路径：`evaluatePocket` 用现有 `pointSegmentDistance` 检查 C→G 线段到全部袋口的净空，距离 `< mouthRadius - BALL_RADIUS` 时该袋不可行。`randomShot` 因此会拒绝这些采样并重采样；不得改 checks/seams/verify，不得新增依赖。

**Blocked by:** 03

**Status:** done

## Acceptance criteria

- [ ] 有效台面判定复用共享 `POCKETS[].mouthRadius`：球心到任一袋心距离 `< mouthRadius + BALL_RADIUS` 时不合法；母球、目标球、ghost 都使用该判定。`evaluatePocket` 另用 `pointSegmentDistance` 检查 C→G 线段到全部袋口的净空，距离 `< mouthRadius - BALL_RADIUS - 1e-9` 时该袋不可行。
- [ ] `createShot({x:0,z:-0.599},{x:0,z:0})` 返回 `null`：母球在上中袋洞内，即使其它几何条件满足也不得生成局面。
- [ ] 固定序列/直接局面回归：`[0.5, 1/1200, 0.5, 0.5]`（母球入袋）、`[0.4, 1/1200, 0.75, 0.04]`（C→G 距中袋心 `0.03509 < mouthRadius-R = 0.0381`）与 `createShot({x:-0.09,z:-0.5998},{x:1.186,z:-0.592})`（C→G 距中袋心 `0.03767 < 0.0381`，唯一可行角袋）都必须被拒绝；前两个随机序列后接合法后备局面 `cue=(0.4,0.2)`、`target=(-0.4,-0.1)` 的采样值 `[0.6619433198380567, 0.6666666666666667, 0.33805668016194335, 0.41666666666666663]`，`randomShot` 必须消耗 12 个采样并返回后备局面。
- [ ] 随机不变量测试（至少 100 个种子）新增“母球、目标球、ghost 不在任何袋洞”与“C→G 到任一袋心距离均 `>= mouthRadius - R - 1e-9`”；原有矩形内缩、不重叠、挡线、切角、选袋断言继续通过。
- [ ] `pnpm test`（至少 13 个测试）与 `pnpm build` 通过；不新增依赖，不改 `.matt.json`。

## Verification

- 执行 `pnpm test`、`pnpm build`。
- 固定序列在 `node:test` 中复现；本票不需要启动浏览器。

## Skills

- tdd

## Out of scope

- 视觉、UI、相机、材质改动。


## Status note

integrated 9a592c840fb9f0aae6ac0641f46a53b4fa930723; task tree checks-only integration.