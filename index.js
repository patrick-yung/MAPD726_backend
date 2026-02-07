let SERVER_NAME = 'user-api';
let PORT = process.env.PORT || 3000;

const mongoose = require("mongoose");
const username = "user1";
const password = "strongpassword";
const dbname = "Cluster0";

let uristring = `mongodb+srv://${username}:${password}@cluster0.vlecl7q.mongodb.net/${dbname}?retryWrites=true&w=majority`;

mongoose.connect(uristring, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
  console.log("!!!! Connected to db: " + uristring);
});

let errors = require('restify-errors');
let restify = require('restify');

let server = restify.createServer({ name: SERVER_NAME });

server.listen(PORT, function () {
  console.log('Server %s listening at %s', server.name, server.url);
  console.log('**** Resources: ****');
  console.log('********************');
  console.log(' /users');
  console.log(' /users/:id');
  console.log(' /users/:userId/shoplists');
  console.log(' /users/:userId/shoplists/:listId');
  console.log(' /users/:userId/shoplists/:listId/items');
  console.log(' /users/:userId/shoplists/:listId/items/:itemId');
  console.log(' /users/:userId/shoplists/search');
  console.log(' /users/shoplists/topics/:topic');
});

server.use(restify.plugins.fullResponse());
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

const shopListItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 }
});

const shopListSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  items: [shopListItemSchema]
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  shopLists: [shopListSchema]
});

const User = mongoose.model('User', userSchema);

let functionCallCounts = {};

function trackFunctionCall(endpoint, method) {
  const key = `${method} ${endpoint}`;
  if (!functionCallCounts[key]) {
    functionCallCounts[key] = 0;
  }
  functionCallCounts[key]++;
}

// ==================== USER ENDPOINTS ====================

server.get('/users', function (req, res, next) {
  console.log('GET /users');
  trackFunctionCall('/users', 'GET');

  User.find({})
    .then((users) => {
      res.send(users);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.get('/users/:id', function (req, res, next) {
  console.log('GET /users/:id params=>' + JSON.stringify(req.params));
  trackFunctionCall('/users/:id', 'GET');

  User.findById(req.params.id)
    .then((user) => {
      if (user) {
        res.send(user);
      } else {
        res.send(404);
      }
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.post('/users', function (req, res, next) {
  console.log('POST /users body=>' + JSON.stringify(req.body));
  trackFunctionCall('/users', 'POST');

  if (!req.body) {
    return next(new errors.BadRequestError('Request body is missing or not parsed. Make sure you send JSON and set Content-Type: application/json'));
  }

  if (req.body.username === undefined) {
    return next(new errors.BadRequestError('Username must be supplied'));
  }

  User.findOne({ username: req.body.username })
    .then((existingUser) => {
      if (existingUser) {
        return next(new errors.ConflictError(`User with username '${req.body.username}' already exists`));
      }

      let newUser = new User({
        username: req.body.username,
        shopLists: []
      });

      return newUser.save();
    })
    .then((user) => {
      console.log("saved user: " + JSON.stringify(user));
      res.send(201, user);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.put('/users/:id', function (req, res, next) {
  console.log('PUT /users/:id params=>' + JSON.stringify(req.params));
  console.log('PUT /users/:id body=>' + JSON.stringify(req.body));
  trackFunctionCall('/users/:id', 'PUT');

  User.findById(req.params.id)
    .then((existingUser) => {
      if (!existingUser) {
        return next(new errors.NotFoundError(`User with id '${req.params.id}' not found`));
      }

      if (req.body.username === undefined) {
        return next(new errors.BadRequestError('Username must be supplied'));
      }

      existingUser.username = req.body.username;

      return existingUser.save();
    })
    .then((updatedUser) => {
      res.send(200, updatedUser);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.del('/users/:id', function (req, res, next) {
  console.log('DELETE /users/:id params=>' + JSON.stringify(req.params));
  trackFunctionCall('/users/:id', 'DELETE');
  
  User.findByIdAndDelete(req.params.id)
    .then((user) => {
      if (!user) {
        return next(new errors.NotFoundError(`User with id '${req.params.id}' not found`));
      }
      res.send(200, {
        message: `User '${user.username}' deleted successfully`,
        deletedUser: user
      });
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.del('/users', function (req, res, next) {
  console.log('DELETE /users - Deleting all users');
  trackFunctionCall('/users', 'DELETE');
  
  User.deleteMany({})
    .then((result) => {
      res.send(200, {
        message: `Successfully deleted all users`,
        deletedCount: result.deletedCount
      });
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

// ==================== SHOP LIST ENDPOINTS ====================

server.get('/users/:userId/shoplists', function (req, res, next) {
  console.log('GET /users/:userId/shoplists params=>' + JSON.stringify(req.params));
  trackFunctionCall('/users/:userId/shoplists', 'GET');

  User.findById(req.params.userId)
    .then((user) => {
      if (!user) {
        return next(new errors.NotFoundError(`User with id '${req.params.userId}' not found`));
      }
      res.send(user.shopLists);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.post('/users/:userId/shoplists', function (req, res, next) {
  console.log('POST /users/:userId/shoplists params=>' + JSON.stringify(req.params));
  console.log('POST /users/:userId/shoplists body=>' + JSON.stringify(req.body));
  trackFunctionCall('/users/:userId/shoplists', 'POST');

  if (!req.body.topic) {
    return next(new errors.BadRequestError('Topic must be supplied for the shop list'));
  }

  User.findById(req.params.userId)
    .then((user) => {
      if (!user) {
        return next(new errors.NotFoundError(`User with id '${req.params.userId}' not found`));
      }

      const newShopList = {
        topic: req.body.topic,
        items: req.body.items || []
      };

      user.shopLists.push(newShopList);
      
      return user.save();
    })
    .then((updatedUser) => {
      const newShopList = updatedUser.shopLists[updatedUser.shopLists.length - 1];
      res.send(201, newShopList);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.get('/users/:userId/shoplists/:listId', function (req, res, next) {
  console.log('GET /users/:userId/shoplists/:listId params=>' + JSON.stringify(req.params));
  trackFunctionCall('/users/:userId/shoplists/:listId', 'GET');

  User.findById(req.params.userId)
    .then((user) => {
      if (!user) {
        return next(new errors.NotFoundError(`User with id '${req.params.userId}' not found`));
      }

      const shopList = user.shopLists.id(req.params.listId);
      if (!shopList) {
        return next(new errors.NotFoundError(`Shop list with id '${req.params.listId}' not found`));
      }

      res.send(shopList);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.put('/users/:userId/shoplists/:listId', function (req, res, next) {
  console.log('PUT /users/:userId/shoplists/:listId params=>' + JSON.stringify(req.params));
  console.log('PUT /users/:userId/shoplists/:listId body=>' + JSON.stringify(req.body));
  trackFunctionCall('/users/:userId/shoplists/:listId', 'PUT');

  if (!req.body.topic) {
    return next(new errors.BadRequestError('Topic must be supplied'));
  }

  User.findById(req.params.userId)
    .then((user) => {
      if (!user) {
        return next(new errors.NotFoundError(`User with id '${req.params.userId}' not found`));
      }

      const shopList = user.shopLists.id(req.params.listId);
      if (!shopList) {
        return next(new errors.NotFoundError(`Shop list with id '${req.params.listId}' not found`));
      }

      shopList.topic = req.body.topic;
      
      return user.save();
    })
    .then((updatedUser) => {
      const updatedShopList = updatedUser.shopLists.id(req.params.listId);
      res.send(200, updatedShopList);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.del('/users/:userId/shoplists/:listId', function (req, res, next) {
  console.log('DELETE /users/:userId/shoplists/:listId params=>' + JSON.stringify(req.params));
  trackFunctionCall('/users/:userId/shoplists/:listId', 'DELETE');

  User.findById(req.params.userId)
    .then((user) => {
      if (!user) {
        return next(new errors.NotFoundError(`User with id '${req.params.userId}' not found`));
      }

      const shopList = user.shopLists.id(req.params.listId);
      if (!shopList) {
        return next(new errors.NotFoundError(`Shop list with id '${req.params.listId}' not found`));
      }

      shopList.remove();
      
      return user.save();
    })
    .then((updatedUser) => {
      res.send(200, {
        message: 'Shop list deleted successfully',
        userId: req.params.userId,
        listId: req.params.listId
      });
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

// ==================== SHOP LIST ITEMS ENDPOINTS ====================

server.get('/users/:userId/shoplists/:listId/items', function (req, res, next) {
  console.log('GET /users/:userId/shoplists/:listId/items params=>' + JSON.stringify(req.params));
  trackFunctionCall('/users/:userId/shoplists/:listId/items', 'GET');

  User.findById(req.params.userId)
    .then((user) => {
      if (!user) {
        return next(new errors.NotFoundError(`User with id '${req.params.userId}' not found`));
      }

      const shopList = user.shopLists.id(req.params.listId);
      if (!shopList) {
        return next(new errors.NotFoundError(`Shop list with id '${req.params.listId}' not found`));
      }

      res.send(shopList.items);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.post('/users/:userId/shoplists/:listId/items', function (req, res, next) {
  console.log('POST /users/:userId/shoplists/:listId/items params=>' + JSON.stringify(req.params));
  console.log('POST /users/:userId/shoplists/:listId/items body=>' + JSON.stringify(req.body));
  trackFunctionCall('/users/:userId/shoplists/:listId/items', 'POST');

  if (!req.body.name) {
    return next(new errors.BadRequestError('Item name must be supplied'));
  }
  if (req.body.price === undefined) {
    return next(new errors.BadRequestError('Item price must be supplied'));
  }

  const price = Number(req.body.price);
  if (isNaN(price) || price < 0) {
    return next(new errors.BadRequestError('Price must be a valid number 0 or greater'));
  }

  User.findById(req.params.userId)
    .then((user) => {
      if (!user) {
        return next(new errors.NotFoundError(`User with id '${req.params.userId}' not found`));
      }

      const shopList = user.shopLists.id(req.params.listId);
      if (!shopList) {
        return next(new errors.NotFoundError(`Shop list with id '${req.params.listId}' not found`));
      }

      const newItem = {
        name: req.body.name,
        price: price
      };

      shopList.items.push(newItem);
      
      return user.save();
    })
    .then((updatedUser) => {
      const shopList = updatedUser.shopLists.id(req.params.listId);
      const newItem = shopList.items[shopList.items.length - 1];
      res.send(201, newItem);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.put('/users/:userId/shoplists/:listId/items/:itemId', function (req, res, next) {
  console.log('PUT /users/:userId/shoplists/:listId/items/:itemId params=>' + JSON.stringify(req.params));
  console.log('PUT /users/:userId/shoplists/:listId/items/:itemId body=>' + JSON.stringify(req.body));
  trackFunctionCall('/users/:userId/shoplists/:listId/items/:itemId', 'PUT');

  if (!req.body.name && req.body.price === undefined) {
    return next(new errors.BadRequestError('Either name or price must be supplied for update'));
  }

  if (req.body.price !== undefined) {
    const price = Number(req.body.price);
    if (isNaN(price) || price < 0) {
      return next(new errors.BadRequestError('Price must be a valid number 0 or greater'));
    }
  }

  User.findById(req.params.userId)
    .then((user) => {
      if (!user) {
        return next(new errors.NotFoundError(`User with id '${req.params.userId}' not found`));
      }

      const shopList = user.shopLists.id(req.params.listId);
      if (!shopList) {
        return next(new errors.NotFoundError(`Shop list with id '${req.params.listId}' not found`));
      }

      const item = shopList.items.id(req.params.itemId);
      if (!item) {
        return next(new errors.NotFoundError(`Item with id '${req.params.itemId}' not found`));
      }

      if (req.body.name !== undefined) {
        item.name = req.body.name;
      }
      if (req.body.price !== undefined) {
        item.price = Number(req.body.price);
      }

      return user.save();
    })
    .then((updatedUser) => {
      const shopList = updatedUser.shopLists.id(req.params.listId);
      const updatedItem = shopList.items.id(req.params.itemId);
      res.send(200, updatedItem);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.del('/users/:userId/shoplists/:listId/items/:itemId', function (req, res, next) {
  console.log('DELETE /users/:userId/shoplists/:listId/items/:itemId params=>' + JSON.stringify(req.params));
  trackFunctionCall('/users/:userId/shoplists/:listId/items/:itemId', 'DELETE');

  User.findById(req.params.userId)
    .then((user) => {
      if (!user) {
        return next(new errors.NotFoundError(`User with id '${req.params.userId}' not found`));
      }

      const shopList = user.shopLists.id(req.params.listId);
      if (!shopList) {
        return next(new errors.NotFoundError(`Shop list with id '${req.params.listId}' not found`));
      }

      const item = shopList.items.id(req.params.itemId);
      if (!item) {
        return next(new errors.NotFoundError(`Item with id '${req.params.itemId}' not found`));
      }

      item.remove();
      
      return user.save();
    })
    .then((updatedUser) => {
      res.send(200, {
        message: 'Item deleted successfully',
        userId: req.params.userId,
        listId: req.params.listId,
        itemId: req.params.itemId
      });
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

// ==================== SEARCH ENDPOINTS ====================

server.get('/users/:userId/shoplists/search', function (req, res, next) {
  console.log('GET /users/:userId/shoplists/search params=>' + JSON.stringify(req.params));
  console.log('GET /users/:userId/shoplists/search query=>' + JSON.stringify(req.query));
  trackFunctionCall('/users/:userId/shoplists/search', 'GET');

  const topic = req.query.topic;
  const minItems = req.query.minItems ? Number(req.query.minItems) : null;
  const maxItems = req.query.maxItems ? Number(req.query.maxItems) : null;

  User.findById(req.params.userId)
    .then((user) => {
      if (!user) {
        return next(new errors.NotFoundError(`User with id '${req.params.userId}' not found`));
      }

      let filteredLists = user.shopLists;

      if (topic) {
        filteredLists = filteredLists.filter(list => 
          list.topic.toLowerCase().includes(topic.toLowerCase())
        );
      }

      if (minItems !== null && !isNaN(minItems)) {
        filteredLists = filteredLists.filter(list => list.items.length >= minItems);
      }

      if (maxItems !== null && !isNaN(maxItems)) {
        filteredLists = filteredLists.filter(list => list.items.length <= maxItems);
      }

      res.send(filteredLists);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.get('/users/shoplists/topics/:topic', function (req, res, next) {
  console.log('GET /users/shoplists/topics/:topic params=>' + JSON.stringify(req.params));
  trackFunctionCall('/users/shoplists/topics/:topic', 'GET');

  const topic = req.params.topic;

  User.find({ 'shopLists.topic': { $regex: new RegExp(topic, 'i') } })
    .then((users) => {
      const results = [];

      users.forEach(user => {
        user.shopLists.forEach(shopList => {
          if (shopList.topic.toLowerCase().includes(topic.toLowerCase())) {
            results.push({
              userId: user._id,
              username: user.username,
              shopListId: shopList._id,
              topic: shopList.topic,
              itemCount: shopList.items.length
            });
          }
        });
      });

      res.send(200, {
        message: "Shop lists filtered by topic",
        topic: topic,
        count: results.length,
        shopLists: results
      });
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});