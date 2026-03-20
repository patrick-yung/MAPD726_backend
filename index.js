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
  console.log('**** User Auth API Resources: ****');
  console.log('**********************************');
  console.log(' GET    /users');
  console.log(' POST   /users');
  console.log(' POST   /users/authenticate');
  console.log(' GET    /users/:id');
  console.log(' GET    /users/:id/password');
  console.log(' PUT    /users/:id');
  console.log(' DELETE /users/:id');
  console.log(' DELETE /users');
  console.log(' /users/:userId/shoplists');
  console.log(' /users/:userId/shoplists/:listId');
  console.log(' /users/:userId/shoplists/:listId/items');
  console.log(' /users/:userId/shoplists/:listId/items/:itemId');
  console.log(' /users/:userId/shoplists/search');
  console.log(' /users/shoplists/topics/:topic');
  console.log('**** Product API Resources: ****');
  console.log(' GET    /products');
  console.log(' GET    /products/categorized');
  console.log(' GET    /products/search?q=:query');
  console.log(' GET    /products/category/:category');
  console.log(' POST   /products');
  console.log(' PUT    /products/:id');
  console.log(' DELETE /products/:id');
  console.log(' POST   /products/seed');
});

server.use(restify.plugins.fullResponse());
server.use(restify.plugins.bodyParser());
server.use(restify.plugins.queryParser());

const shopListItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  addedDate: { type: Date, default: Date.now },
  isChecked: { type: Boolean, default: false }
});

const shopListSchema = new mongoose.Schema({
  topic: { type: String, required: true },
  items: [shopListItemSchema],
  createdDate: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true, default: '123' },
  shopLists: [shopListSchema]
});

const User = mongoose.model('User', userSchema);

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  prices: {
    walmart: { type: Number, required: true, min: 0 },
    costco: { type: Number, required: true, min: 0 },
    superstore: { type: Number, required: true, min: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

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
      const usersWithoutPasswords = users.map(user => {
        const userObj = user.toObject();
        delete userObj.password;
        return userObj;
      });
      res.send(usersWithoutPasswords);
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
        const userObj = user.toObject();
        delete userObj.password;
        res.send(userObj);
      } else {
        res.send(404);
      }
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.get('/users/:id/password', function (req, res, next) {
  console.log('GET /users/:id/password params=>' + JSON.stringify(req.params));
  trackFunctionCall('/users/:id/password', 'GET');

  User.findById(req.params.id)
    .then((user) => {
      if (!user) {
        return next(new errors.NotFoundError(`User with id '${req.params.id}' not found`));
      }
      res.send({ password: user.password });
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

server.post('/users/authenticate', function (req, res, next) {
  console.log('POST /users/authenticate body=>' + JSON.stringify(req.body));
  trackFunctionCall('/users/authenticate', 'POST');

  if (!req.body) {
    return next(new errors.BadRequestError('Request body is missing'));
  }

  if (req.body.username === undefined || req.body.password === undefined) {
    return next(new errors.BadRequestError('Username and password must be supplied'));
  }

  User.findOne({ username: req.body.username })
    .then((user) => {
      if (!user) {
        return next(new errors.UnauthorizedError('Invalid username or password'));
      }

      if (user.password !== req.body.password) {
        return next(new errors.UnauthorizedError('Invalid username or password'));
      }

      const userObj = user.toObject();
      delete userObj.password;
      
      res.send({
        success: true,
        message: 'Authentication successful',
        user: userObj
      });
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
        return Promise.reject(new errors.ConflictError(`User with username '${req.body.username}' already exists`));
      }

      let newUser = new User({
        username: req.body.username,
        password: req.body.password || '123',
        shopLists: []
      });

      return newUser.save();
    })
    .then((user) => {
      console.log("saved user: " + JSON.stringify(user));
      const userObj = user.toObject();
      delete userObj.password;
      res.send(201, userObj);
      return next();
    })
    .catch((error) => {
      return next(error);
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

      let updatePromise = Promise.resolve();

      if (req.body.username !== undefined) {
        if (req.body.username !== existingUser.username) {
          updatePromise = User.findOne({ username: req.body.username })
            .then((userWithSameName) => {
              if (userWithSameName) {
                throw new errors.ConflictError(`User with username '${req.body.username}' already exists`);
              }
              existingUser.username = req.body.username;
            });
        }
      }

      return updatePromise.then(() => {
        if (req.body.password !== undefined) {
          existingUser.password = req.body.password;
        }
        return existingUser.save();
      });
    })
    .then((updatedUser) => {
      const userObj = updatedUser.toObject();
      delete userObj.password;
      res.send(200, userObj);
      return next();
    })
    .catch((error) => {
      return next(error);
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
        deletedUser: user.username
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

      user.shopLists = user.shopLists.filter(list => 
        list._id.toString() !== req.params.listId
      );
      
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
      console.error("Error deleting shop list:", error);
      return next(new Error(JSON.stringify(error.errors || error.message)));
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
        price: price,
        isChecked: req.body.isChecked !== undefined ? req.body.isChecked : false
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

  if (!req.body.name && req.body.price === undefined && req.body.isChecked === undefined) {
    return next(new errors.BadRequestError('At least one field (name, price, or isChecked) must be supplied for update'));
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
      if (req.body.isChecked !== undefined) {
        item.isChecked = req.body.isChecked;
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

      shopList.items = shopList.items.filter(item => 
        item._id.toString() !== req.params.itemId
      );
      
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
      console.error("Error deleting item:", error);
      return next(new Error(JSON.stringify(error.errors || error.message)));
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
              itemCount: shopList.items.length,
              createdDate: shopList.createdDate
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

// ==================== PRODUCT ENDPOINTS ====================

// Get all products
server.get('/products', function (req, res, next) {
  console.log('GET /products');
  trackFunctionCall('/products', 'GET');

  Product.find({})
    .then((products) => {
      res.send(products);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

// Get categorized products (grouped by category)
server.get('/products/categorized', function (req, res, next) {
  console.log('GET /products/categorized');
  trackFunctionCall('/products/categorized', 'GET');

  Product.find({})
    .then((products) => {
      const categorizedData = {};
      
      products.forEach(product => {
        if (!categorizedData[product.category]) {
          categorizedData[product.category] = {};
        }
        
        categorizedData[product.category][product.name] = [
          product.prices.walmart,
          product.prices.costco,
          product.prices.superstore
        ];
      });
      
      res.send(categorizedData);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

// Search products by name
server.get('/products/search', function (req, res, next) {
  console.log('GET /products/search query=>' + JSON.stringify(req.query));
  trackFunctionCall('/products/search', 'GET');

  const query = req.query.q;
  if (!query) {
    return next(new errors.BadRequestError('Search query parameter "q" is required'));
  }

  Product.find({ name: { $regex: new RegExp(query, 'i') } })
    .then((products) => {
      res.send(products);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

// Get products by category
server.get('/products/category/:category', function (req, res, next) {
  console.log('GET /products/category/:category params=>' + JSON.stringify(req.params));
  trackFunctionCall('/products/category/:category', 'GET');

  Product.find({ category: { $regex: new RegExp(req.params.category, 'i') } })
    .then((products) => {
      res.send(products);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

// Create a new product
server.post('/products', function (req, res, next) {
  console.log('POST /products body=>' + JSON.stringify(req.body));
  trackFunctionCall('/products', 'POST');

  if (!req.body.name || !req.body.category || !req.body.prices) {
    return next(new errors.BadRequestError('Name, category, and prices are required'));
  }

  const newProduct = new Product({
    name: req.body.name,
    category: req.body.category,
    prices: {
      walmart: req.body.prices.walmart,
      costco: req.body.prices.costco,
      superstore: req.body.prices.superstore
    }
  });

  newProduct.save()
    .then((product) => {
      res.send(201, product);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

// Update a product
server.put('/products/:id', function (req, res, next) {
  console.log('PUT /products/:id params=>' + JSON.stringify(req.params));
  console.log('PUT /products/:id body=>' + JSON.stringify(req.body));
  trackFunctionCall('/products/:id', 'PUT');

  Product.findById(req.params.id)
    .then((product) => {
      if (!product) {
        return next(new errors.NotFoundError(`Product with id '${req.params.id}' not found`));
      }

      if (req.body.name) product.name = req.body.name;
      if (req.body.category) product.category = req.body.category;
      if (req.body.prices) {
        if (req.body.prices.walmart !== undefined) product.prices.walmart = req.body.prices.walmart;
        if (req.body.prices.costco !== undefined) product.prices.costco = req.body.prices.costco;
        if (req.body.prices.superstore !== undefined) product.prices.superstore = req.body.prices.superstore;
      }
      product.updatedAt = Date.now();

      return product.save();
    })
    .then((updatedProduct) => {
      res.send(200, updatedProduct);
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

// Delete a product
server.del('/products/:id', function (req, res, next) {
  console.log('DELETE /products/:id params=>' + JSON.stringify(req.params));
  trackFunctionCall('/products/:id', 'DELETE');

  Product.findByIdAndDelete(req.params.id)
    .then((product) => {
      if (!product) {
        return next(new errors.NotFoundError(`Product with id '${req.params.id}' not found`));
      }
      res.send(200, {
        message: `Product '${product.name}' deleted successfully`,
        deletedProduct: product.name
      });
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});

// Seed initial product data (run this once to populate the database)
server.post('/products/seed', function (req, res, next) {
  const sampleProducts = [
    { name: "Milk (4L)", category: "Poultry", prices: { walmart: 5.49, costco: 5.29, superstore: 5.59 } },
    { name: "Eggs (12pk)", category: "Poultry", prices: { walmart: 3.99, costco: 3.50, superstore: 4.10 } },
    { name: "Bread", category: "Bakery", prices: { walmart: 2.99, costco: 2.79, superstore: 3.29 } },
    { name: "Bagels (6pk)", category: "Bakery", prices: { walmart: 3.49, costco: 3.99, superstore: 3.29 } },
    { name: "Bananas", category: "Produce", prices: { walmart: 0.79, costco: 0.69, superstore: 0.89 } },
    { name: "Apples (1lb)", category: "Produce", prices: { walmart: 2.49, costco: 2.99, superstore: 2.29 } },
    { name: "Rice (8kg)", category: "Pantry", prices: { walmart: 18.99, costco: 17.99, superstore: 19.49 } },
    { name: "Flour (2kg)", category: "Pantry", prices: { walmart: 4.49, costco: 4.99, superstore: 4.29 } },
    { name: "Sugar (1kg)", category: "Pantry", prices: { walmart: 2.99, costco: 2.79, superstore: 3.19 } }
  ];
  
  Product.insertMany(sampleProducts)
    .then((products) => {
      res.send(201, { message: "Sample data added successfully", count: products.length });
      return next();
    })
    .catch((error) => {
      return next(new Error(JSON.stringify(error.errors)));
    });
});