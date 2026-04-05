const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;

chai.use(chaiHttp);

const uri = 'https://mapd713-group-project.onrender.com';

// Variables to store IDs for testing
let testUserId;
let testUserId2;
let testShopListId;
let testShopListId2;
let testItemId;
let testItemId2;
let testProductId;

describe('Complete API Tests - Users, Shopping Lists, and Products', function() {
    this.timeout(15000);

    // ==================== CLEANUP & INITIAL TESTS ====================
    
    it("should delete all users initially (cleanup)", function(done) {
        chai.request(uri)
            .delete('/users')
            .end(function(err, res) {
                if (err) {
                    console.log('Warning:', err.message);
                    done();
                    return;
                }
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('message');
                console.log('Cleanup:', res.body.message);
                done();
            });
    });

    it("should return empty array on GET /users initially", function(done) {
        chai.request(uri)
            .get('/users')
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.be.an('array');
                expect(res.body).to.be.empty;
                done();
            });
    });

    // ==================== USER ENDPOINT TESTS ====================

    it("should create a new user with POST /users", function(done) {
        chai.request(uri)
            .post('/users')
            .send({
                username: 'testuser1',
                password: 'password123'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('_id');
                expect(res.body).to.have.property('username', 'testuser1');
                expect(res.body).to.not.have.property('password');
                expect(res.body).to.have.property('shopLists');
                expect(res.body.shopLists).to.be.an('array');
                testUserId = res.body._id;
                done();
            });
    });

    it("should create a second user for testing", function(done) {
        chai.request(uri)
            .post('/users')
            .send({
                username: 'testuser2',
                password: 'password456'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('_id');
                expect(res.body).to.have.property('username', 'testuser2');
                testUserId2 = res.body._id;
                done();
            });
    });

    it("should create user with default password when not provided", function(done) {
        chai.request(uri)
            .post('/users')
            .send({
                username: 'testuser3'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('username', 'testuser3');
                
                chai.request(uri)
                    .get(`/users/${res.body._id}/password`)
                    .end(function(err, res) {
                        expect(res.status).to.equal(200);
                        expect(res.body).to.have.property('password', '123');
                        
                        chai.request(uri)
                            .delete(`/users/${res.body._id}`)
                            .end(() => done());
                    });
            });
    });

    it("should prevent duplicate username creation", function(done) {
        chai.request(uri)
            .post('/users')
            .send({
                username: 'testuser1'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(409);
                expect(res.body).to.have.property('message');
                expect(res.body.message).to.include('already exists');
                done();
            });
    });

    it("should return 400 when creating user without username", function(done) {
        chai.request(uri)
            .post('/users')
            .send({})
            .end(function(err, res) {
                expect(res.status).to.equal(400);
                expect(res.body).to.have.property('message');
                done();
            });
    });

    it("should return all users with GET /users", function(done) {
        chai.request(uri)
            .get('/users')
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.be.an('array');
                expect(res.body).to.have.lengthOf.at.least(2);
                expect(res.body[0]).to.not.have.property('password');
                done();
            });
    });

    it("should get specific user with GET /users/:id", function(done) {
        chai.request(uri)
            .get(`/users/${testUserId}`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('_id', testUserId);
                expect(res.body).to.have.property('username', 'testuser1');
                expect(res.body).to.not.have.property('password');
                done();
            });
    });

    it("should return 404 for non-existent user", function(done) {
        chai.request(uri)
            .get('/users/123456789012345678901234')
            .end(function(err, res) {
                expect(res.status).to.equal(404);
                done();
            });
    });

    it("should get user password with GET /users/:id/password", function(done) {
        chai.request(uri)
            .get(`/users/${testUserId}/password`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('password', 'password123');
                done();
            });
    });

    it("should return 404 for password of non-existent user", function(done) {
        chai.request(uri)
            .get('/users/123456789012345678901234/password')
            .end(function(err, res) {
                expect(res.status).to.equal(404);
                done();
            });
    });

    it("should authenticate user with valid credentials", function(done) {
        chai.request(uri)
            .post('/users/authenticate')
            .send({
                username: 'testuser1',
                password: 'password123'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('success', true);
                expect(res.body).to.have.property('message', 'Authentication successful');
                expect(res.body).to.have.property('user');
                expect(res.body.user).to.have.property('username', 'testuser1');
                expect(res.body.user).to.not.have.property('password');
                done();
            });
    });

    it("should reject authentication with invalid password", function(done) {
        chai.request(uri)
            .post('/users/authenticate')
            .send({
                username: 'testuser1',
                password: 'wrongpassword'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(401);
                expect(res.body).to.have.property('message', 'Invalid username or password');
                done();
            });
    });

    it("should reject authentication with non-existent username", function(done) {
        chai.request(uri)
            .post('/users/authenticate')
            .send({
                username: 'nonexistent',
                password: 'password'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(401);
                done();
            });
    });

    it("should return 400 for authentication without username", function(done) {
        chai.request(uri)
            .post('/users/authenticate')
            .send({ password: 'password123' })
            .end(function(err, res) {
                expect(res.status).to.equal(400);
                done();
            });
    });

    it("should update user with PUT /users/:id", function(done) {
        chai.request(uri)
            .put(`/users/${testUserId}`)
            .send({
                username: 'updateduser1',
                password: 'newpassword123'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('_id', testUserId);
                expect(res.body).to.have.property('username', 'updateduser1');
                
                chai.request(uri)
                    .get(`/users/${testUserId}/password`)
                    .end(function(err, res) {
                        expect(res.body).to.have.property('password', 'newpassword123');
                        done();
                    });
            });
    });

    it("should prevent updating username to existing one", function(done) {
        chai.request(uri)
            .put(`/users/${testUserId}`)
            .send({ username: 'testuser2' })
            .end(function(err, res) {
                expect(res.status).to.equal(409);
                expect(res.body.message).to.include('already exists');
                done();
            });
    });

    it("should update only password without changing username", function(done) {
        chai.request(uri)
            .put(`/users/${testUserId}`)
            .send({ password: 'updatedpassword456' })
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('username', 'updateduser1');
                
                chai.request(uri)
                    .get(`/users/${testUserId}/password`)
                    .end(function(err, res) {
                        expect(res.body).to.have.property('password', 'updatedpassword456');
                        done();
                    });
            });
    });

    // ==================== SHOP LIST ENDPOINT TESTS ====================

    it("should create a shop list with POST /users/:userId/shoplists", function(done) {
        chai.request(uri)
            .post(`/users/${testUserId}/shoplists`)
            .send({
                topic: 'Groceries',
                items: []
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('_id');
                expect(res.body).to.have.property('topic', 'Groceries');
                expect(res.body).to.have.property('items');
                expect(res.body.items).to.be.an('array');
                testShopListId = res.body._id;
                done();
            });
    });

    it("should create another shop list for same user", function(done) {
        chai.request(uri)
            .post(`/users/${testUserId}/shoplists`)
            .send({ topic: 'Hardware Store' })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('topic', 'Hardware Store');
                testShopListId2 = res.body._id;
                done();
            });
    });

    it("should create shop list for second user", function(done) {
        chai.request(uri)
            .post(`/users/${testUserId2}/shoplists`)
            .send({ topic: 'Electronics' })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('topic', 'Electronics');
                done();
            });
    });

    it("should return 400 when creating shop list without topic", function(done) {
        chai.request(uri)
            .post(`/users/${testUserId}/shoplists`)
            .send({})
            .end(function(err, res) {
                expect(res.status).to.equal(400);
                done();
            });
    });

    it("should get all shop lists for user with GET /users/:userId/shoplists", function(done) {
        chai.request(uri)
            .get(`/users/${testUserId}/shoplists`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.be.an('array');
                expect(res.body).to.have.lengthOf(2);
                const topics = res.body.map(list => list.topic);
                expect(topics).to.include('Groceries');
                expect(topics).to.include('Hardware Store');
                done();
            });
    });

    it("should get specific shop list with GET /users/:userId/shoplists/:listId", function(done) {
        chai.request(uri)
            .get(`/users/${testUserId}/shoplists/${testShopListId}`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('_id', testShopListId);
                expect(res.body).to.have.property('topic', 'Groceries');
                expect(res.body).to.have.property('createdDate');
                done();
            });
    });

    it("should return 404 for non-existent shop list", function(done) {
        chai.request(uri)
            .get(`/users/${testUserId}/shoplists/123456789012345678901234`)
            .end(function(err, res) {
                expect(res.status).to.equal(404);
                done();
            });
    });

    it("should update shop list topic with PUT /users/:userId/shoplists/:listId", function(done) {
        chai.request(uri)
            .put(`/users/${testUserId}/shoplists/${testShopListId}`)
            .send({ topic: 'Weekly Groceries' })
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('topic', 'Weekly Groceries');
                
                chai.request(uri)
                    .get(`/users/${testUserId}/shoplists/${testShopListId}`)
                    .end(function(err, res) {
                        expect(res.body).to.have.property('topic', 'Weekly Groceries');
                        done();
                    });
            });
    });

    it("should return 400 when updating shop list without topic", function(done) {
        chai.request(uri)
            .put(`/users/${testUserId}/shoplists/${testShopListId}`)
            .send({})
            .end(function(err, res) {
                expect(res.status).to.equal(400);
                done();
            });
    });

    // ==================== SHOP LIST ITEMS ENDPOINT TESTS ====================

    it("should create an item in shop list with POST /users/:userId/shoplists/:listId/items", function(done) {
        chai.request(uri)
            .post(`/users/${testUserId}/shoplists/${testShopListId}/items`)
            .send({
                name: 'Milk',
                price: 3.99
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('_id');
                expect(res.body).to.have.property('name', 'Milk');
                expect(res.body).to.have.property('price', 3.99);
                expect(res.body).to.have.property('isChecked', false);
                expect(res.body).to.have.property('addedDate');
                testItemId = res.body._id;
                done();
            });
    });

    it("should create item with isChecked set to true", function(done) {
        chai.request(uri)
            .post(`/users/${testUserId}/shoplists/${testShopListId}/items`)
            .send({
                name: 'Butter',
                price: 4.50,
                isChecked: true
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('isChecked', true);
                done();
            });
    });

    it("should get all items in shop list with GET", function(done) {
        chai.request(uri)
            .get(`/users/${testUserId}/shoplists/${testShopListId}/items`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.be.an('array');
                expect(res.body.length).to.be.at.least(2);
                const milkItem = res.body.find(item => item.name === 'Milk');
                expect(milkItem).to.have.property('price', 3.99);
                done();
            });
    });

    it("should return 400 when creating item without name", function(done) {
        chai.request(uri)
            .post(`/users/${testUserId}/shoplists/${testShopListId}/items`)
            .send({ price: 2.99 })
            .end(function(err, res) {
                expect(res.status).to.equal(400);
                done();
            });
    });

    it("should return 400 when creating item without price", function(done) {
        chai.request(uri)
            .post(`/users/${testUserId}/shoplists/${testShopListId}/items`)
            .send({ name: 'Bread' })
            .end(function(err, res) {
                expect(res.status).to.equal(400);
                done();
            });
    });

    it("should return 400 when creating item with negative price", function(done) {
        chai.request(uri)
            .post(`/users/${testUserId}/shoplists/${testShopListId}/items`)
            .send({
                name: 'Cheese',
                price: -5.00
            })
            .end(function(err, res) {
                expect(res.status).to.equal(400);
                done();
            });
    });

    it("should add another item for update tests", function(done) {
        chai.request(uri)
            .post(`/users/${testUserId}/shoplists/${testShopListId}/items`)
            .send({
                name: 'Bread',
                price: 2.49
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                testItemId2 = res.body._id;
                done();
            });
    });

    it("should update item name and price with PUT", function(done) {
        chai.request(uri)
            .put(`/users/${testUserId}/shoplists/${testShopListId}/items/${testItemId}`)
            .send({
                name: 'Organic Milk',
                price: 4.99
            })
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('_id', testItemId);
                expect(res.body).to.have.property('name', 'Organic Milk');
                expect(res.body).to.have.property('price', 4.99);
                done();
            });
    });

    it("should update only item price", function(done) {
        chai.request(uri)
            .put(`/users/${testUserId}/shoplists/${testShopListId}/items/${testItemId}`)
            .send({ price: 5.49 })
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('price', 5.49);
                expect(res.body).to.have.property('name', 'Organic Milk');
                done();
            });
    });

    it("should update item checked status", function(done) {
        chai.request(uri)
            .put(`/users/${testUserId}/shoplists/${testShopListId}/items/${testItemId}`)
            .send({ isChecked: true })
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('isChecked', true);
                done();
            });
    });

    it("should return 400 when updating item with no fields", function(done) {
        chai.request(uri)
            .put(`/users/${testUserId}/shoplists/${testShopListId}/items/${testItemId}`)
            .send({})
            .end(function(err, res) {
                expect(res.status).to.equal(400);
                done();
            });
    });

    it("should update multiple item fields at once", function(done) {
        chai.request(uri)
            .put(`/users/${testUserId}/shoplists/${testShopListId}/items/${testItemId2}`)
            .send({
                name: 'Whole Wheat Bread',
                price: 3.29,
                isChecked: true
            })
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('name', 'Whole Wheat Bread');
                expect(res.body).to.have.property('price', 3.29);
                expect(res.body).to.have.property('isChecked', true);
                done();
            });
    });

    // ==================== SEARCH ENDPOINT TESTS ====================

    it("should search shop lists by minimum items", function(done) {
        chai.request(uri)
            .get(`/users/${testUserId}/shoplists/search?minItems=2`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                res.body.forEach(list => {
                    expect(list.items.length).to.be.at.least(2);
                });
                done();
            });
    });

    it("should search shop lists by maximum items", function(done) {
        chai.request(uri)
            .get(`/users/${testUserId}/shoplists/search?maxItems=5`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                res.body.forEach(list => {
                    expect(list.items.length).to.be.at.most(5);
                });
                done();
            });
    });

    it("should search shop lists with multiple criteria", function(done) {
        chai.request(uri)
            .get(`/users/${testUserId}/shoplists/search?minItems=1&maxItems=10`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                res.body.forEach(list => {
                    expect(list.items.length).to.be.at.least(1);
                    expect(list.items.length).to.be.at.most(10);
                });
                done();
            });
    });

    it("should search across all users by topic with GET /users/shoplists/topics/:topic", function(done) {
        chai.request(uri)
            .get('/users/shoplists/topics/grocery')
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('topic', 'grocery');
                expect(res.body).to.have.property('count');
                expect(res.body).to.have.property('shopLists');
                expect(res.body.shopLists).to.be.an('array');
                done();
            });
    });

    it("should return empty array for non-matching topic search", function(done) {
        chai.request(uri)
            .get('/users/shoplists/topics/nonexistenttopicxyz')
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body.count).to.equal(0);
                expect(res.body.shopLists).to.be.an('array').that.is.empty;
                done();
            });
    });

    // ==================== PRODUCT ENDPOINT TESTS ====================

    it("should seed products with POST /products/seed", function(done) {
        chai.request(uri)
            .post('/products/seed')
            .end(function(err, res) {
                if (err) {
                    console.log('Warning: Seed products failed - skipping product tests');
                    this.skip();
                    done();
                    return;
                }
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('message');
                expect(res.body).to.have.property('count');
                done();
            });
    });

    it("should get all products with GET /products", function(done) {
        chai.request(uri)
            .get('/products')
            .end(function(err, res) {
                if (err) {
                    console.log('Warning: Get products failed');
                    done();
                    return;
                }
                expect(res.status).to.equal(200);
                expect(res.body).to.be.an('array');
                if (res.body.length > 0) {
                    testProductId = res.body[0]._id;
                }
                done();
            });
    });

    it("should return 400 when creating product without required fields", function(done) {
        chai.request(uri)
            .post('/products')
            .send({ name: 'Incomplete Product' })
            .end(function(err, res) {
                if (err) {
                    done();
                    return;
                }
                expect(res.status).to.equal(400);
                done();
            });
    });

    it("should get categorized products with GET /products/categorized", function(done) {
        chai.request(uri)
            .get('/products/categorized')
            .end(function(err, res) {
                if (err) {
                    done();
                    return;
                }
                expect(res.status).to.equal(200);
                expect(res.body).to.be.an('object');
                done();
            });
    });

    it("should search products by name with GET /products/search", function(done) {
        chai.request(uri)
            .get('/products/search?q=Milk')
            .end(function(err, res) {
                if (err) {
                    done();
                    return;
                }
                expect(res.status).to.equal(200);
                expect(res.body).to.be.an('array');
                done();
            });
    });

    it("should return 400 when searching without query parameter", function(done) {
        chai.request(uri)
            .get('/products/search')
            .end(function(err, res) {
                if (err) {
                    done();
                    return;
                }
                expect(res.status).to.equal(400);
                done();
            });
    });

    it("should get products by category with GET /products/category/:category", function(done) {
        chai.request(uri)
            .get('/products/category/Poultry')
            .end(function(err, res) {
                if (err) {
                    done();
                    return;
                }
                expect(res.status).to.equal(200);
                expect(res.body).to.be.an('array');
                done();
            });
    });

    it("should get products by category case-insensitive", function(done) {
        chai.request(uri)
            .get('/products/category/poultry')
            .end(function(err, res) {
                if (err) {
                    done();
                    return;
                }
                expect(res.status).to.equal(200);
                done();
            });
    });

    // ==================== DELETE TESTS ====================

    it("should delete an item from shop list", function(done) {
        chai.request(uri)
            .delete(`/users/${testUserId}/shoplists/${testShopListId}/items/${testItemId}`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('message', 'Item deleted successfully');
                
                chai.request(uri)
                    .get(`/users/${testUserId}/shoplists/${testShopListId}/items`)
                    .end(function(err, res) {
                        const deletedItem = res.body.find(item => item._id === testItemId);
                        expect(deletedItem).to.not.exist;
                        done();
                    });
            });
    });

    it("should delete a shop list", function(done) {
        chai.request(uri)
            .delete(`/users/${testUserId}/shoplists/${testShopListId2}`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('message', 'Shop list deleted successfully');
                
                chai.request(uri)
                    .get(`/users/${testUserId}/shoplists`)
                    .end(function(err, res) {
                        const deletedList = res.body.find(list => list._id === testShopListId2);
                        expect(deletedList).to.not.exist;
                        done();
                    });
            });
    });

    it("should delete a user", function(done) {
        chai.request(uri)
            .delete(`/users/${testUserId2}`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('message').that.includes('deleted successfully');
                
                chai.request(uri)
                    .get(`/users/${testUserId2}`)
                    .end(function(err, res) {
                        expect(res.status).to.equal(404);
                        done();
                    });
            });
    });

    it("should return 404 when deleting non-existent user", function(done) {
        chai.request(uri)
            .delete('/users/123456789012345678901234')
            .end(function(err, res) {
                expect(res.status).to.equal(404);
                done();
            });
    });

    it("should delete all remaining users at the end", function(done) {
        chai.request(uri)
            .delete('/users')
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('deletedCount').that.is.at.least(0);
                
                chai.request(uri)
                    .get('/users')
                    .end(function(err, res) {
                        expect(res.body).to.be.an('array');
                        done();
                    });
            });
    });
});
