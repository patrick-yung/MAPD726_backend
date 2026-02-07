// appointments_test.js
const chai = require('chai');
const chaiHttp = require('chai-http');
const expect = chai.expect;

chai.use(chaiHttp);

// 🔗 Use the same deployed URL pattern as patient_test.js
const uri = 'https://mapd713-group-project-2.onrender.com';

// We'll reuse this variable across tests
let createdAppointmentId = null;

describe('Appointments API Tests', function () {
  // In case Render is a bit slow
  this.timeout(10000);

  it('should return HTTP 200 on GET /appointments', function (done) {
    chai.request(uri)
      .get('/appointments')
      .end(function (err, res) {
        expect(res).to.have.property('status');
        expect(res.status).to.equal(200);
        done(err);
      });
  });

  it('should return an array on GET /appointments', function (done) {
    chai.request(uri)
      .get('/appointments')
      .end(function (err, res) {
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');
        // Each appointment (if any) should have basic fields
        if (res.body.length > 0) {
          const a = res.body[0];
          expect(a).to.have.property('_id');
          expect(a).to.have.property('patientName');
          expect(a).to.have.property('doctorName');
        }
        done(err);
      });
  });

  it('should create a new appointment with POST /appointments', function (done) {
    chai.request(uri)
      .post('/appointments')
      .send({
        patientName: 'Test Patient For Appointments',
        doctorName: 'Dr. Tester',
        appointmentDate: '2025-01-01T10:00:00Z',
        reason: 'Routine check-up',
        status: 'Scheduled',
        isEmergency: false
      })
      .end(function (err, res) {
        expect(res.status).to.equal(201);
        expect(res.body).to.be.an('object');

        expect(res.body).to.have.property('_id');
        expect(res.body).to.have.property('patientName', 'Test Patient For Appointments');
        expect(res.body).to.have.property('doctorName', 'Dr. Tester');
        expect(res.body).to.have.property('appointmentDate');
        expect(res.body).to.have.property('reason', 'Routine check-up');
        expect(res.body).to.have.property('status', 'Scheduled');

        createdAppointmentId = res.body._id; // save for later tests
        done(err);
      });
  });

  it('should fetch the created appointment by ID with GET /appointments/:id', function (done) {
    if (!createdAppointmentId) {
      return done(new Error('No appointment ID saved from previous test'));
    }

    chai.request(uri)
      .get('/appointments/' + createdAppointmentId)
      .end(function (err, res) {
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('object');

        expect(res.body).to.have.property('_id', createdAppointmentId);
        expect(res.body).to.have.property('patientName', 'Test Patient For Appointments');
        expect(res.body).to.have.property('doctorName', 'Dr. Tester');
        expect(res.body).to.have.property('reason', 'Routine check-up');
        expect(res.body).to.have.property('status');
        expect(res.body).to.have.property('isEmergency');

        done(err);
      });
  });

  it('should update the appointment with PUT /appointments/:id', function (done) {
    if (!createdAppointmentId) {
      return done(new Error('No appointment ID saved from previous test'));
    }

    chai.request(uri)
      .put('/appointments/' + createdAppointmentId)
      .send({
        patientName: 'Updated Test Patient',
        doctorName: 'Dr. Updated',
        appointmentDate: '2025-01-02T11:30:00Z',
        reason: 'Updated reason',
        status: 'Completed',
        isEmergency: true // test emergency flag as truthy
      })
      .end(function (err, res) {
        expect(res.status).to.equal(200);
        // Your PUT returns { success: true }
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('success', true);

        // Now verify the data was actually changed via GET
        chai.request(uri)
          .get('/appointments/' + createdAppointmentId)
          .end(function (err2, res2) {
            expect(res2.status).to.equal(200);
            expect(res2.body).to.have.property('_id', createdAppointmentId);
            expect(res2.body).to.have.property('patientName', 'Updated Test Patient');
            expect(res2.body).to.have.property('doctorName', 'Dr. Updated');
            expect(res2.body).to.have.property('reason', 'Updated reason');
            expect(res2.body).to.have.property('status', 'Completed');
            // isEmergency normalized to true/false
            expect(res2.body).to.have.property('isEmergency', true);
            done(err2);
          });
      });
  });

  it('should include the appointment in /appointments and reflect updated data', function (done) {
    if (!createdAppointmentId) {
      return done(new Error('No appointment ID saved from previous test'));
    }

    chai.request(uri)
      .get('/appointments')
      .end(function (err, res) {
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('array');

        const found = res.body.find(a => a._id === createdAppointmentId);
        expect(found).to.exist;
        expect(found).to.have.property('patientName', 'Updated Test Patient');
        expect(found).to.have.property('status', 'Completed');
        done(err);
      });
  });

  it('should return a count from GET /appointments/count', function (done) {
    chai.request(uri)
      .get('/appointments/count')
      .end(function (err, res) {
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('count');
        expect(res.body.count).to.be.a('number');
        done(err);
      });
  });

  it('should delete the created appointment with DELETE /appointments/:id', function (done) {
    if (!createdAppointmentId) {
      return done(new Error('No appointment ID saved from previous test'));
    }

    chai.request(uri)
      .delete('/appointments/' + createdAppointmentId)
      .end(function (err, res) {
        expect(res.status).to.equal(200);
        expect(res.body).to.be.an('object');
        expect(res.body).to.have.property('message');
        expect(res.body).to.have.property('deletedId', createdAppointmentId);

        // Verify it no longer exists
        chai.request(uri)
          .get('/appointments/' + createdAppointmentId)
          .end(function (err2, res2) {
            expect(res2.status).to.equal(404);
            done(err || err2);
          });
      });
  });
});
