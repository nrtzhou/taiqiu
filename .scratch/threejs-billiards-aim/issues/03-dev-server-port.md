# 03: Vite dev server 固定 6173 端口

**What to build:** 让 `pnpm dev` 固定监听 6173 端口并启用 strictPort：6173 可用时实际监听 6173，被占用时明确报错而不是自动换端口；README 的访问说明同步为 `http://localhost:6173`。最小改动，不引入额外依赖。

**Blocked by:** None (can start immediately)

**Status:** done

## Acceptance criteria

- [ ] `pnpm dev` 实际监听 6173 且启用 strictPort：dev script 为 `vite --port 6173 --strictPort`，或 Vite 配置 `server.port: 6173` + `strictPort: true`；未新增依赖、未改其他脚本。
- [ ] 在本票 worktree 独立启动 `pnpm dev`，启动日志与实际监听（如端口探测/`curl`）都证明是 6173；不得影响或杀掉用户根目录的 dev server。
- [ ] 6173 已被临时占位监听时，`pnpm dev` 明确报端口冲突并非零退出，不会自动改用其他端口；验证后停掉占位监听。
- [ ] README 中端口/访问地址说明同步为 `http://localhost:6173`。
- [ ] `pnpm test`、`pnpm build` 通过。
- [ ] 无 TODO、无临时调试代码。

## Verification

- 后台启动 `pnpm dev`，用 `ss`/`lsof` 或 `curl -I http://localhost:6173` 验证监听端口与响应；随后停掉该 dev server。
- 用一个临时本地监听占住 6173（如 `node -e "require('net').createServer().listen(6173)"`），再次运行 `pnpm dev`，确认报端口冲突且非零退出、未换端口；停掉占位监听并确认 6173 释放。
- `pnpm test`、`pnpm build`。

## Skills

- `ponytail`：一行 dev script 或一个 `server.port` 配置即可，不加依赖、不加脚本开关。

## Out of scope

- 生产构建/预览端口、其他 npm scripts、Vite 插件或依赖变更。
- 视觉改动（票 01/02）。


## Status note

integrated bc7cdc2f4ac5b04a0a4bd9760091de9c01f2860f; task tree checks-only integration.