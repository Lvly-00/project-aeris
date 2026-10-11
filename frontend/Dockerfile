FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
# Templated conf: nginx:alpine's entrypoint renders {AI_SERVICE_API_KEY} from
# the container env into /etc/nginx/conf.d/default.conf at boot.
COPY nginx/default.conf /etc/nginx/templates/default.conf.template
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
