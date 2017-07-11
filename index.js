/*
 * Copyright 2017 Teppo Kurki <teppo.kurki@iki.fi>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

const Bacon = require("baconjs");
const debug = require("debug")("signalk:simple-api");
const schema = require("signalk-schema");

module.exports = function(app) {
  let data = {};

  return {
    id: "simple-api",
    name: "Simple Signal K http api",
    description: "Plugin that provides a simple http api to Signal K data",

    schema: {
      type: "object",
      properties: {}
    },

    start: function(options) {
      data = {};
      const selfId = "vessels." + app.selfId;
      app.signalk.on("delta", delta => {
        if (delta.context && delta.context === selfId) {
          handleDelta(delta, data);
        }
      });
    },
    stop: function() {},
    signalKApiRoutes: function(router) {
      router.get("/self/values", (req, res, next) => {
        console.log(JSON.stringify())
        res.json(Object.keys(data).map(propName => data[propName]));
      });
      router.get("/self/values/:path/:sourceRef", (req, res, next) => {
        const fullId = getFullId(req.params.path, req.params.sourceRef);
        console.log(fullId)
        console.log(data[fullId])
        if (data[fullId]) {
          res.json(data[fullId]);
        } else {
          res.status(404);
          res.end();
        }
      });
      return router;
    }
  };
};

function handleDelta(delta, data) {
  delta.updates &&
    delta.updates.forEach(update => {
      const sourceRef = getSourceRef(update);
      update.values &&
        update.values.forEach(pathValue => {
          const fullId = getFullId(pathValue.path, sourceRef);
          data[fullId] = {
            path: pathValue.path,
            value: pathValue.value,
            sourceRef: sourceRef
          };
        });
    });
}

function getFullId(path, sourceRef) {
  return path + "/" + sourceRef
}

function getSourceRef(update) {
  if (update.source) {
    return schema.getSourceId(update.source);
  } else if (update["$source"]) {
    return update["$source"];
  } else {
    console.error("No source id in " + JSON.stringify(update));
    return "";
  }
}
