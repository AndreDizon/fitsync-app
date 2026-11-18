# Using Codex CLI with FitSync

Double-click **FitSync Codex CLI** on the desktop. The launcher opens the project automatically and calls `codex.cmd`, avoiding the PowerShell script-policy error without changing Windows execution policy.

## Menu

1. **Continue this conversation**: copy the current conversation into a separate CLI chat. Use this on your first visit.
2. **Reopen a saved chat**: select your CLI conversation and continue where you stopped. Use this on later visits.
3. **Start a new FitSync chat**: begin with a fresh conversation in this project.
4. **How to use Codex**: display a short help screen.
5. **Exit**: close the launcher.

Once Codex opens, type a request in plain English and press Enter. For example:

> Check the mobile footer spacing, fix any overflow, and explain what changed.

Use `/exit` to return to the menu. Use `/resume` inside Codex to choose a saved conversation. Do not type `run codex`: `run` is not a terminal command. If starting manually from PowerShell, use `codex.cmd` rather than `codex`.

The CLI is already signed in using ChatGPT. Avoid running edits to the same files simultaneously in the IDE assistant and CLI.

## Project handoff

- Read the applicable `AGENTS.md` files before editing.
- Preserve the user's mascot artwork and hero backgrounds, including the mobile versions.
- FitSync uses pulse yellow for primary actions, performance white, charcoal, energy orange, and brown. Blue, pink, and purple are supporting colors. Keep depth and glass effects subtle.
- Social overview cards use clearly labeled fictional examples; real posts are shown inside their respective feeds.
- The rabbit preview avatar has its own crop and scale to match the other animal portraits and avoid a double purple rim.
- Password recovery rejects the existing password while allowing another attempt with the same unexpired recovery authorization. Do not unnecessarily require another email code.
- Never commit `.env.local`, tokens, or credentials. Inspect changes before committing and pushing.

## Local launcher

The desktop shortcut points to `%LOCALAPPDATA%\FitSyncCodex\start.cmd`. This file is local to this computer and is not committed. It sets `TERM` only for its own process and leaves system execution policy unchanged.
