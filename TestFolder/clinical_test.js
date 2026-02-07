const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;

chai.use(chaiHttp);

// Option A:live Render app
//const uri = 'https://mapd713-group-project.onrender.com'; 
//const uri = 'https://lab09-monitoring-render-sample-code-2025-aqin.onrender.com';
const uri = 'https://mapd713-group-project.onrender.com';
// Option B: Test local server
// const uri = 'http://127.0.0.1:3000'; 

describe('Clinical Data API Tests', function() {

    this.timeout(15000);
    
    let testPatientId;

   // 1. Setup: Create a Patient first
    it("should create a patient for clinical testing", function(done) {
        chai.request(uri)
            .post('/patients')
            .send({
                name: 'Test Subject ' + Date.now(),
                age: 50,
                gender: 'Male',
                history: 'Testing'
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('_id');
                testPatientId = res.body._id; 
                done();
            });
    });

    // 2. Test POST Normal Data
    it("should add NORMAL clinical data (Flagged: False)", function(done) {
        chai.request(uri)
            .post('/clinicaldata')
            .send({
                patientId: testPatientId,
                type: 'Heart Rate',
                value: '75',
                measuredDateTime: new Date()
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('flagged', false);
                done();
            });
    });

    // 3. Test POST Critical Data
    it("should add CRITICAL clinical data and auto-flag it (Flagged: True)", function(done) {
        chai.request(uri)
            .post('/clinicaldata')
            .send({
                patientId: testPatientId,
                type: 'Blood Pressure',
                value: '180/120',
                measuredDateTime: new Date()
            })
            .end(function(err, res) {
                expect(res.status).to.equal(201);
                expect(res.body).to.have.property('flagged', true);
                done();
            });
    });

    // 4. Test Filtering by Type
    it("should filter clinical data by Type", function(done) {
        chai.request(uri)
            .get('/clinicaldata/types/Blood Pressure') 
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('clinicalData');
                done();
            });
    });

    // 5. Test Critical Report 
    it("should generate a Critical Patients Report", function(done) {
        chai.request(uri)
            .get('/patients/critical/report') // <--- Updated URL
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('reportName', 'Critical Patients Report');
                // Your index.js returns 'criticalPatients' for this route, not 'criticalData'
                expect(res.body).to.have.property('criticalPatients'); 
                done();
            });
    });

    // 6. Test Joined Report
    it("should generate the Detailed Critical Report (Joined Data)", function(done) {
        chai.request(uri)
            .get('/patients/critical/report')
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                expect(res.body).to.have.property('criticalPatients');
                done();
            });
    });

    // 7. Cleanup: Delete clinical data
    it("should delete all clinical data", function(done) {
        chai.request(uri)
            .delete('/clinicaldata')
            .end(function(err, res) {
                expect(res.status).to.equal(200);
                done();
            });
    });

    // 8. Cleanup: Delete the test patient
    it("should delete the test patient", function(done) {
        chai.request(uri)
            .delete('/patients/' + testPatientId)
            .end(function(err, res) {
                expect(res.status).to.equal(204);
                done();
            });
    });
});
