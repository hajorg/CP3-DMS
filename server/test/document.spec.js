import supertest from 'supertest';
import should from 'should';
import db from '../../server/models';
import app from '../../server';
import testData from './helpers/specHelper';

const server = supertest.agent(app);
let token, adminToken, user4Token, userId,
  adminId, user4Id, documentId1, documentId2;

describe('Document Api', () => {
  before((done) => {
    server.post('/users')
      .send(testData.regularUser3)
      .end((err, res) => {
        token = res.body.token;
        userId = res.body.userId;
      });
    server.post('/users')
      .send(testData.adminUser3)
      .end((err, res) => {
        should(res.body).have.property('token');
        adminToken = res.body.token;
        adminId = res.body.userId;
      });
    server.post('/users')
      .send(testData.regularUser4)
      .end((err, res) => {
        should(res.body).have.property('token');
        user4Token = res.body.token;
        user4Id = res.body.userId;
        done();
      });
  });

  describe('Create', () => {
    it('should create new document', (done) => {
      server.post('/documents')
      .send(testData.document)
      .set({ 'x-access-token': token })
        .end((err, res) => {
          res.body.should.have.property('document');
          should(res.body.document.access).equal('public');
          documentId1 = res.body.document.id;
          done();
        });
    });

    it('should not create document with null field(s)', (done) => {
      const doc = {
        title: 'Doc 1',
      };
      server.post('/documents')
      .send(doc)
      .set({ 'x-access-token': token })
        .end((err, res) => {
          should(res.body).have.a.property('error');
          done();
        });
    });

    it('should send an error message for a user not logged in', (done) => {
      server.post('/documents')
      .send(testData.document2)
        .end((err, res) => {
          res.status.should.equal(401);
          done();
        });
    });

    it('should be able to make document', (done) => {
      server.post('/documents')
      .send(testData.document2)
      .set({ 'x-access-token': token })
        .end((err, res) => {
          res.body.should.have.property('document');
          should(res.body.document.access).equal('private');
          documentId2 = res.body.document.id;
          done();
        });
    });
  });

  describe('Find', () => {
    it('should return document', (done) => {
      server.get(`/documents/${documentId1}`)
      .set({ 'x-access-token': token })
        .end((err, res) => {
          res.status.should.equal(200);
          done();
        });
    });

    it('should get a private document for an admin', (done) => {
      server.get(`/documents/${documentId2}`)
      .set({ 'x-access-token': adminToken })
        .end((err, res) => {
          res.status.should.equal(200);
          done();
        });
    });

    it(`should not return private document to a user 
    who does NOT own the document`, (done) => {
      server.get(`/documents/${documentId2}`)
      .set({ 'x-access-token': user4Token })
        .end((err, res) => {
          res.status.should.equal(403);
          done();
        });
    });

    it('should return all documents', (done) => {
      server.get('/documents')
      .set({ 'x-access-token': token })
        .end((err, res) => {
          res.status.should.equal(200);
          res.body.document.should.be.a.Array();
          should(res.body.document[0].access).equal('private');
          should(res.body.document.length).equal(2);
          done();
        });
    });

    it('should return all documents to an admin', (done) => {
      server.get('/documents')
      .set({ 'x-access-token': adminToken })
        .end((err, res) => {
          res.status.should.equal(200);
          res.body.document.should.be.a.Array();
          should(res.body.document.length).equal(2);
          done();
        });
    });

    it(`should return only public documents to a user 
    who is not the owner or an admin`, (done) => {
      server.get('/documents')
      .set({ 'x-access-token': user4Token })
        .end((err, res) => {
          res.status.should.equal(200);
          res.body.document.should.be.a.Array();
          should(res.body.document.length).equal(1);
          should(res.body.document[0].access).equal('public');
          done();
        });
    });

    it('should return error for a not logged in user', (done) => {
      server.get('/documents')
        .end((err, res) => {
          res.status.should.equal(401);
          done();
        });
    });

    it('should return not found for a document not created', (done) => {
      server.get('/documents/122')
      .set({ 'x-access-token': token })
        .end((err, res) => {
          res.status.should.equal(404);
          done();
        });
    });
  });

  describe('Edit', () => {
    const doc = {
      title: 'Doc 1 edit',
    };
    const doc2 = {
      title: 'Not valid',
    };
    it('should edit document', (done) => {
      server.put(`/documents/${documentId2}`)
      .send(doc)
      .set({ 'x-access-token': token })
        .end((err, res) => {
          res.status.should.equal(200);
          should(res.body.title).be.exactly(doc.title);
          done();
        });
    });

    it('should return not found for a document not created', (done) => {
      server.put('/documents/122')
      .send(doc)
      .set({ 'x-access-token': token })
        .end((err, res) => {
          res.status.should.equal(404);
          done();
        });
    });

    it('should return error if user is not authorized', (done) => {
      server.put(`/documents/${documentId1}`)
      .send(doc)
        .end((err, res) => {
          res.status.should.equal(401);
          done();
        });
    });

    it(`should return error 
    if user is not the owner of the document`, (done) => {
      server.put(`/documents/${documentId1}`)
      .send(doc2)
      .set({ 'x-access-token': user4Token })
        .end((err, res) => {
          res.status.should.equal(403);
          done();
        });
    });
  });

  describe('User\'s document', () => {
    it(`should return all documents for a particular user 
    GET users/:id/documents`, (done) => {
      server.get(`/users/${userId}/documents`)
      .set({ 'x-access-token': token })
        .end((err, res) => {
          res.status.should.equal(200);
          res.body.documents.should.be.a.Array();
          done();
        });
    });

    it(`should return error if user is not authorized 
    GET users/:id/documents`, (done) => {
      server.get(`/users/${userId}/documents`)
        .end((err, res) => {
          res.status.should.equal(401);
          done();
        });
    });
  });

  describe('Search:', () => {
    it(`should return all documents for users 
    where search terms are matched`, (done) => {
      server.get('/documents/search?search=Doc 1 edit')
      .set({ 'x-access-token': token })
      .end((err, res) => {
        res.status.should.equal(200);
        res.body.should.be.a.Array();
        should(res.body.length).equal(1);
        done();
      });
    });

    it('should return all documents to an admin', (done) => {
      server.get('/documents/search?search=Doc 1 edit')
      .set({ 'x-access-token': adminToken })
      .end((err, res) => {
        res.status.should.equal(200);
        res.body.should.be.a.Array();
        should(res.body.length).equal(1);
        done();
      });
    });

    it(`should return the user's documents and public documents of other
    users where search terms are matched`, (done) => {
      server.get('/documents/search?search=Doc 1 edit')
      .set({ 'x-access-token': user4Token })
      .end((err, res) => {
        res.status.should.equal(200);
        res.body.should.be.a.Array();
        should(res.body.length).equal(0);
        done();
      });
    });
  });

  describe('Delete', () => {
    it('should delete document DELETE /documents/:id', (done) => {
      server.delete(`/documents/${documentId1}`)
      .set({ 'x-access-token': token })
        .end((err, res) => {
          res.status.should.equal(200);
          done();
        });
    });

    it(`should return not found for a document not created 
    DELETE /documents/:id`, (done) => {
      server.delete('/documents/122')
      .set({ 'x-access-token': token })
        .end((err, res) => {
          res.status.should.equal(404);
          done();
        });
    });

    it(`user who is not the owner should not be able to delete documents
    DELETE /documents/:id`, (done) => {
      server.delete(`/documents/${documentId2}`)
      .set({ 'x-access-token': user4Token })
        .end((err, res) => {
          res.status.should.equal(403);
          done();
        });
    });

    it(`admin should be able to delete documents
    DELETE /documents/:id`, (done) => {
      server.delete(`/documents/${documentId2}`)
      .set({ 'x-access-token': adminToken })
        .end((err, res) => {
          res.status.should.equal(200);
          done();
        });
    });

    it(`should return error if user is not authorized 
    DELETE /documents/:id`, (done) => {
      server.delete(`/documents/${documentId1}`)
        .end((err, res) => {
          res.status.should.equal(401);
          done();
        });
    });
  });
});
