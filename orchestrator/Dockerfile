# ============================================================
# Stage 1: Builder
#   - 全 dependencies を入れる(tsc 必要)
#   - TypeScript を dist/ にコンパイル
# ============================================================
FROM node:24-slim AS builder

WORKDIR /app

# package.json と lockfile だけ先にコピー → npm ci のキャッシュ効率化
COPY package*.json ./

# devDependencies 含めてフルインストール(tsc が必要)
RUN npm ci

# ソース類をコピー
COPY tsconfig.json ./
COPY src ./src

# TypeScript → JavaScript ビルド
RUN npm run build


# ============================================================
# Stage 2: Runtime
#   - production dependencies のみ
#   - dist/ + templates/ + 必要な実行ファイルのみコピー
#   - 非 root ユーザーで起動
# ============================================================
FROM node:24-slim AS runtime

WORKDIR /app

# 環境変数(デフォルト)
ENV NODE_ENV=production
ENV PORT=8080

# package.json と lockfile をコピー、production deps だけ入れる
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Builder からビルド済みコードをコピー
COPY --from=builder /app/dist ./dist

# Flutter テンプレートをコピー(claude-code.ts が cwd で参照する)
COPY templates ./templates

# 非 root ユーザーで実行(node イメージは既に node ユーザーを持っている)
RUN mkdir -p /app/.tmp && chown -R node:node /app
USER node

# Hono が listen するポート
EXPOSE 8080

# 起動コマンド
CMD ["node", "dist/index.js"]
