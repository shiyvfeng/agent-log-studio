#!/bin/zsh
cd "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo '请先安装 Node.js 20.19+ 或 22.12+。'
  read '?按回车退出'
  exit 1
fi
if [ ! -d node_modules ]; then
  npm install || exit 1
fi
if curl -fsS http://127.0.0.1:${PORT:-4320}/api/health >/dev/null 2>&1; then
  open http://127.0.0.1:${PORT:-4320}
  exit 0
fi
(sleep 2; open http://127.0.0.1:${PORT:-4320}) &
npm run dev
