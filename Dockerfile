FROM node:22-alpine

WORKDIR /app

# 复制 standalone 构建产物
COPY .next/standalone ./
COPY public ./public

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_PUBLIC_SYH_API_BASE=https://api.shareyourhealth.cn

EXPOSE 3000

CMD ["node", "server.js"]
