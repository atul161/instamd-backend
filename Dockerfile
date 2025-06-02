FROM public.ecr.aws/docker/library/node:lts-alpine3.18 AS deps
RUN apk update
RUN apk upgrade
RUN apk -a info curl
RUN apk add curl
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
ENV PORT 3000
CMD node dist/main