# Suggestions on creation taken from DigitalOcean
# https://www.digitalocean.com/community/tutorials/how-to-build-a-node-js-application-with-docker

# Normal image ~1.12GB vs ~155MB on Alpine Linux
FROM node:lts-alpine AS build-stage

RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app
COPY ./package*.json ./
RUN npm install
COPY ./ ./

RUN npm run build
# Now /usr/src/app/dist has the built files.


# Now build the image from the compiled JS files
FROM node:lts-slim

RUN apt-get update \
    && apt-get install -y wget gnupg \
    && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
      --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*
    
RUN mkdir -p /home/node/app/node_modules && \
    chown -R node:node /home/node/app
WORKDIR /home/node/app

# Adding this COPY instruction before running npm 
# install or copying the application code allows us 
# to take advantage of Docker’s caching mechanism. 
# At each stage in the build, Docker will check whether 
# it has a layer cached for that particular instruction. 
# If we change package.json, this layer will be rebuilt, 
# but if we don’t, this instruction will allow Docker to 
# use the existing image layer and skip reinstalling our 
# node modules.
COPY --chown=node:node ./package*.json ./

# To ensure that all of the application files are owned 
# by the non-root node user, including the contents of 
# the node_modules directory, switch the user to node 
# before running npm install:
USER node
RUN npm install --production

COPY --chown=node:node --from=build-stage /usr/src/app/dist ./dist
CMD [ "npm", "run", "start" ]
