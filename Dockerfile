# Suggestions on creation taken from DigitalOcean
# https://www.digitalocean.com/community/tutorials/how-to-build-a-node-js-application-with-docker

# Normal image ~1.12GB vs ~155MB on Alpine Linux
FROM node:lts-alpine AS build-stage

WORKDIR /usr/src/app
COPY package*.json .
RUN npm install
COPY ./* ./

RUN npx tsc
# Now /usr/src/app/dist has the built files.

FROM node:lts-alpine
# Adding this COPY instruction before running npm 
# install or copying the application code allows us 
# to take advantage of Docker’s caching mechanism. 
# At each stage in the build, Docker will check whether 
# it has a layer cached for that particular instruction. 
# If we change package.json, this layer will be rebuilt, 
# but if we don’t, this instruction will allow Docker to 
# use the existing image layer and skip reinstalling our 
# node modules.
COPY ./package*.json ./

# To ensure that all of the application files are owned 
# by the non-root node user, including the contents of 
# the node_modules directory, switch the user to node 
# before running npm install:
USER node
RUN npm install

COPY --chown=node:node . .
CMD [ "node", "app.js" ]


# Normal image ~1.12GB vs ~155MB on Alpine Linux
FROM node:lts-alpine AS build-stage

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
COPY ./package*.json ./

# To ensure that all of the application files are owned 
# by the non-root node user, including the contents of 
# the node_modules directory, switch the user to node 
# before running npm install:
USER node
RUN npm install --production

COPY --chown=node:node --from=build-stage /usr/src/app/dist ./dist
CMD [ "node", "run", "start" ]
