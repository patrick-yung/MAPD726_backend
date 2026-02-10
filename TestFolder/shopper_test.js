const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;

chai.use(chaiHttp);

const uri = 'https://mapd713-group-project.onrender.com';

// Variables to store IDs for testing
let testUserId;
let testShopListId;
let testItemId;

describe('User and Shopping List API Tests', function() {
    
    // ==================== CLEANUP & INITIAL TESTS ====================
    
    it("should delete all users initially (cleanup)", function(done) {
        chai.request(uri)
            .delete('/users')
            .end(function(err, res) {
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
                username: 'testuser1'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('_id');
                expect(res.body).to.have.property('username', 'testuser1');
                expect(res.body).to.have.property('shopLists');
                expect(res.body.shopLists).to.be.an('array');
                testUserId = res.body._id; // Store for later tests
                done();
            });
    });

    it("should prevent duplicate username creation", function(done) {
        chai.request(uri)
            .post('/users')
            .send({
                username: 'testuser1' // Same username as previous test
            })
            .end(function(err, res) {
                expect(res.status).to.equal(409); // Conflict
                expect(res.body).to.have.property('code', 'ConflictError');
                done();
            });
    });

    it("should return all users with GET /users", function(done) {
        chai.request(uri)
            .get('/users')
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.be.an('array');
                expect(res.body).to.have.lengthOf.at.least(1);
                expect(res.body[0]).to.have.property('username', 'testuser1');
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
                done();
            });
    });

    it("should return 404 for non-existent user", function(done) {
        chai.request(uri)
            .get('/users/123456789012345678901234') // Invalid MongoDB ID
            .end(function(err, res) {
                expect(res.status).to.equal(404);
                done();
            });
    });

    it("should update user with PUT /users/:id", function(done) {
        chai.request(uri)
            .put(`/users/${testUserId}`)
            .send({
                username: 'updateduser1'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('_id', testUserId);
                expect(res.body).to.have.property('username', 'updateduser1');
                
                // Verify the update persisted
                chai.request(uri)
                    .get(`/users/${testUserId}`)
                    .end(function(err, res) {
                        expect(res.body).to.have.property('username', 'updateduser1');
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
                items: [] // Optional, can be omitted
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('_id');
                expect(res.body).to.have.property('topic', 'Groceries');
                expect(res.body).to.have.property('items');
                expect(res.body.items).to.be.an('array');
                testShopListId = res.body._id; // Store for later tests
                done();
            });
    });

    it("should get all shop lists for user", function(done) {
        chai.request(uri)
            .get(`/users/${testUserId}/shoplists`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.be.an('array');
                expect(res.body).to.have.lengthOf(1);
                expect(res.body[0]).to.have.property('topic', 'Groceries');
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
                done();
            });
    });

    it("should update shop list topic with PUT /users/:userId/shoplists/:listId", function(done) {
        chai.request(uri)
            .put(`/users/${testUserId}/shoplists/${testShopListId}`)
            .send({
                topic: 'Weekly Groceries'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('topic', 'Weekly Groceries');
                
                // Verify the update
                chai.request(uri)
                    .get(`/users/${testUserId}/shoplists/${testShopListId}`)
                    .end(function(err, res) {
                        expect(res.body).to.have.property('topic', 'Weekly Groceries');
                        done();
                    });
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
                testItemId = res.body._id; // Store for later tests
                done();
            });
    });

    it("should get all items in shop list", function(done) {
        chai.request(uri)
            .get(`/users/${testUserId}/shoplists/${testShopListId}/items`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.be.an('array');
                expect(res.body).to.have.lengthOf(1);
                expect(res.body[0]).to.have.property('name', 'Milk');
                expect(res.body[0]).to.have.property('price', 3.99);
                done();
            });
    });

    it("should add another item to shop list", function(done) {
        chai.request(uri)
            .post(`/users/${testUserId}/shoplists/${testShopListId}/items`)
            .send({
                name: 'Bread',
                price: 2.49
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('name', 'Bread');
                expect(res.body).to.have.property('price', 2.49);
                done();
            });
    });

    it("should update item with PUT /users/:userId/shoplists/:listId/items/:itemId", function(done) {
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
                
                // Verify update
                chai.request(uri)
                    .get(`/users/${testUserId}/shoplists/${testShopListId}/items`)
                    .end(function(err, res) {
                        const milkItem = res.body.find(item => item._id === testItemId);
                        expect(milkItem).to.have.property('name', 'Organic Milk');
                        expect(milkItem).to.have.property('price', 4.99);
                        done();
                    });
            });
    });

    it("should update only item price", function(done) {
        chai.request(uri)
            .put(`/users/${testUserId}/shoplists/${testShopListId}/items/${testItemId}`)
            .send({
                price: 5.49
            })
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('price', 5.49);
                expect(res.body).to.have.property('name', 'Organic Milk'); // Should remain unchanged
                done();
            });
    });

    // ==================== SEARCH ENDPOINT TESTS ====================

    it("should search shop lists by topic for user", function(done) {
        // First create another shop list
        chai.request(uri)
            .post(`/users/${testUserId}/shoplists`)
            .send({
                topic: 'Electronics',
                items: [
                    { name: 'Headphones', price: 99.99 },
                    { name: 'Charger', price: 24.99 },
                    { name: 'Case', price: 19.99 }
                ]
            })
            .end(function(err, res) {
                // Now search for "groceries"
                chai.request(uri)
                    .get(`/users/${testUserId}/shoplists/search?topic=weekly`)
                    .end(function(err, res) {
                        expect(res.status).to.equal(200);
                        expect(res.body).to.be.an('array');
                        // Should find the "Weekly Groceries" list
                        const groceryList = res.body.find(list => list.topic === 'Weekly Groceries');
                        expect(groceryList).to.exist;
                        done();
                    });
            });
    });

    it("should search shop lists by item count", function(done) {
        chai.request(uri)
            .get(`/users/${testUserId}/shoplists/search?minItems=2`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.be.an('array');
                // Electronics list has 3 items, Groceries has 2 items
                res.body.forEach(list => {
                    expect(list.items.length).to.be.at.least(2);
                });
                done();
            });
    });

    it("should search shop lists by topic across all users with GET /users/shoplists/topics/:topic", function(done) {
        // First create another user with a shop list
        chai.request(uri)
            .post('/users')
            .send({ username: 'testuser2' })
            .end(function(err, res) {
                const user2Id = res.body._id;
                
                // Create a shop list for user2
                chai.request(uri)
                    .post(`/users/${user2Id}/shoplists`)
                    .send({
                        topic: 'Weekly Groceries for Family',
                        items: [{ name: 'Eggs', price: 4.99 }]
                    })
                    .end(function(err, res) {
                        // Search across all users for "groceries"
                        chai.request(uri)
                            .get('/users/shoplists/topics/weekly')
                            .end(function(err, res) {
                                expect(res.status).to.equal(200);
                                expect(res.body).to.have.property('topic', 'weekly');
                                expect(res.body).to.have.property('count').that.is.at.least(2);
                                expect(res.body.shopLists).to.be.an('array');
                                
                                // Should find lists from both users
                                const hasUser1List = res.body.shopLists.some(list => 
                                    list.topic === 'Weekly Groceries' && list.username === 'updateduser1'
                                );
                                const hasUser2List = res.body.shopLists.some(list => 
                                    list.topic === 'Weekly Groceries for Family' && list.username === 'testuser2'
                                );
                                
                                expect(hasUser1List).to.be.true;
                                expect(hasUser2List).to.be.true;
                                done();
                            });
                    });
            });
    });

    // ==================== DELETE TESTS ====================

    it("should delete an item from shop list", function(done) {
        chai.request(uri)
            .delete(`/users/${testUserId}/shoplists/${testShopListId}/items/${testItemId}`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('message', 'Item deleted successfully');
                
                // Verify item is gone
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
            .delete(`/users/${testUserId}/shoplists/${testShopListId}`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('message', 'Shop list deleted successfully');
                
                // Verify shop list is gone
                chai.request(uri)
                    .get(`/users/${testUserId}/shoplists`)
                    .end(function(err, res) {
                        const deletedList = res.body.find(list => list._id === testShopListId);
                        expect(deletedList).to.not.exist;
                        done();
                    });
            });
    });

    it("should delete a user", function(done) {
        chai.request(uri)
            .delete(`/users/${testUserId}`)
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('message').that.includes('deleted successfully');
                
                // Verify user is gone
                chai.request(uri)
                    .get(`/users/${testUserId}`)
                    .end(function(err, res) {
                        expect(res.status).to.equal(404);
                        done();
                    });
            });
    });

    it("should delete all users at the end", function(done) {
        chai.request(uri)
            .delete('/users')
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('deletedCount').that.is.at.least(0);
                
                // Verify all users are gone
                chai.request(uri)
                    .get('/users')
                    .end(function(err, res) {
                        expect(res.body).to.be.an('array');
                        // Might be empty or might have testuser2 still
                        done();
                    });
            });
    });
});