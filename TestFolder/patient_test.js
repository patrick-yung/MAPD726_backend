const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;

chai.use(chaiHttp);

const uri = 'https://mapd713-group-project.onrender.com';


describe('Patients API Tests', function() {
    
    it("should return HTTP 200 on GET /patients", function(done) {
        chai.request(uri)
            .get('/patients')
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                done();
            });
    });

    it("should return empty array on GET /patients initially", function(done) {
        chai.request(uri)
            .get('/patients')
            .end(function(err, res) {
                expect(res.body).to.be.an('array');
                done();
            });
    });

    it("should create a new patient with POST /patients", function(done) {
        chai.request(uri)
            .post('/patients')
            .send({
                name: 'Peter Doe',
                age: 21,
                gender: 'Male',
                contact: '96608600',
                history: 'None'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property("name","Peter Doe","age","21","gender","Male","contact","96608600","history","None","_id","1");
                done();
            });
    });

    it("should create another patient with POST /patients", function(done) {
        chai.request(uri)
            .post('/patients')
            .send({
                name: 'Oscar Want',
                age: 45,
                gender: 'Female',
                history: 'Something'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property("name","Oscar Want","age","45","gender","Female","contact","Not Provided","history","Something","_id","2");
                done();
            });
    });
    

    it("should return all patients with GET /patients", function(done) {
        chai.request(uri)
            .get('/patients')
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.be.an('array');
                done();
            });
    });

    it("should Update patient with PUT /patients/:id & Get Patients", function(done) {
        // First, get all patients to find a valid ID
        chai.request(uri)
            .get('/patients')
            .end(function(err, res) {
                if (err) return done(err);
                
                // Check if there are any patients
                if (res.body.length === 0) {
                    return done(new Error('No patients found to update'));
                }
                
                // Use the first patient's ID
                const patientId = res.body[1]._id;
                
                // Now update that patient
                chai.request(uri)
                    .put('/patients/' + patientId)
                    .send({
                        name: 'Oscar Want Updated',
                        age: 32,
                        gender: 'Female', 
                        history: 'Something updated',
                        contact: '123-456-7890'
                    })
                    .end(function(err, res) {
                        expect(res.status).to.equal(200);
                        expect(res.body).to.have.property('name', 'Oscar Want Updated');
                        expect(res.body).to.have.property('age', 32);
                        expect(res.body).to.have.property('gender', 'Female');
                        expect(res.body).to.have.property('history', 'Something updated');
                        expect(res.body).to.have.property('_id', patientId);

                        chai.request(uri)
                            .get('/patients/' + patientId)
                            .end(function(err, res) {
                                expect(res.status).to.equal(200);
                                expect(res.body).to.have.property('name', 'Oscar Want Updated');
                                expect(res.body).to.have.property('age', 32);
                                expect(res.body).to.have.property('gender', 'Female');
                                expect(res.body).to.have.property('history', 'Something updated');
                                expect(res.body).to.have.property('_id', patientId)
                                done();
                            });
                    });
            });
    });

    it("should create a third patient successfully", function(done) {
        chai.request(uri)
            .post('/patients')
            .send({
                name: 'Sarah Johnson',
                age: 28,
                gender: 'Female',
                contact: '555-1234',
                history: 'Allergies to penicillin'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('name', 'Sarah Johnson');
                expect(res.body).to.have.property('age', 28);
                expect(res.body).to.have.property('gender', 'Female');
                expect(res.body).to.have.property('contact', '555-1234');
                expect(res.body).to.have.property('history', 'Allergies to penicillin');
                expect(res.body).to.have.property('_id');
                
                // Store the ID for the delete test
                this.newPatientId = res.body._id;
                done();
            });
    });
    

    it("should delete the newly created patient", function(done) {
        // First, ensure we have a patient ID to delete
        chai.request(uri)
            .get('/patients')
            .end(function(err, res) {
                if (err) return done(err);
                
                // Find Sarah Johnson in the list
                const sarah = res.body.find(patient => patient.name === 'Sarah Johnson');
                if (!sarah) {
                    return done(new Error('Sarah Johnson not found to delete'));
                }
                
                // Now delete her
                chai.request(uri)
                    .delete('/patients/' + sarah._id)
                    .end(function(err, res) {
                        expect(res.status).to.equal(204); // 204 No Content is typical for successful DELETE
                        done();
                    });
            });
    });
    


    it("should delete all patients with DELETE /patients", function(done) {
        chai.request(uri)
            .delete('/patients')
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                done();
            });
    });
});