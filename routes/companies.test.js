process.env.NODE_ENV = 'test'; // connect to the test db

const request = require('supertest');

const app = require('../app');
const db = require('../db');

const ROUTE = '/companies';
const JSON = 'application/json';
let testCompany;

beforeEach(async () => {
  const companyResult = await db.query(`
    INSERT INTO companies
    (code, name, description) 
    VALUES ('ibm', 'IBM', 'Big Blue')
    RETURNING code, name, description
  `);

  const invoiceResult = await db.query(`
    INSERT INTO invoices
    (comp_code, amt)
    VALUES ('ibm', 999)
    RETURNING id
  `);

  testCompany = companyResult.rows[0];
  testCompany.invoices = [invoiceResult.rows[0].id];
});

afterEach(async () => {
  await db.query("DELETE FROM companies"); // delete data created from tests
  await db.query("DELETE FROM invoices");
});

afterAll(async () => {
  await db.end(); // close db connection
});

describe(`GET ${ROUTE}`, () => {
  it("should return a list containing the JSON data for 1 company if no more than 1 company exists", async () => {
    const res = await request(app).get(ROUTE);
    const expectedJSON = {
      companies: [{
        "code": testCompany.code,
        "name": testCompany.name
      }]
    };

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(expectedJSON);
    expect(res.type).toBe(JSON);
  });
  
  it("should return a list containing the JSON data for each company if more than 1 company exists", async () => {
    // add a company
    const result = await db.query(`
      INSERT INTO companies
      (code, name, description) 
      VALUES ('apple', 'Apple', 'Apple Computer')
      RETURNING code, name, description
    `);
    const newCompany = result.rows[0];

    const companies = [newCompany, testCompany].map(c => ({"code": c.code, "name": c.name}));
    
    const res = await request(app).get(ROUTE);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ companies });
    expect(res.type).toBe(JSON);
  });
});

describe(`GET ${ROUTE}/:code`, () => {
  it ("should return a company as JSON", async () => {
    const res = await request(app).get(`${ROUTE}/${testCompany.code}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({company: testCompany});
    expect(res.type).toBe(JSON);
  });

  it (`should return a 404 and the companies in the database 
        should remain unmodified if the company code is invalid`, async () => {

    // turn off console error message 
    const originalError = console.error;
    console.error = jest.fn(); // replace console.error with a Jest-mocked function

    const res = await request(app)
      .get(`${ROUTE}/INVALID_CODE`);

    expect(res.statusCode).toEqual(404);

    const companyRes = await request(app).get(ROUTE);
    const unmodifiedCompanies = {
      companies: [{
        "code": testCompany.code,
        "name": testCompany.name
      }]
    };

    expect(companyRes.body).toEqual(unmodifiedCompanies);

    console.error = originalError;

  });
});

describe(`POST ${ROUTE}`, () => {
  it ("should create a new company and return its data as JSON", async () => {
    const newCompany = {
      "code": "ran",
      "name": "RanCo",
      "description": "A random company"
    };

    const expectedJSON = {
      company: {
        "code": newCompany.code,
        "name": newCompany.name,
        "description": newCompany.description
      }
    };

    const res = await request(app)
      .post(ROUTE)
      .send(newCompany);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toEqual(expectedJSON);
    expect(res.type).toBe(JSON);

  });
});


describe(`PUT ${ROUTE}/:code`, () => {
  it ("should edit an existing company and return its data as JSON", async () => {
    const editedData = {
      "name": "New Name",
      "description": "New description"
    };

    const expectedJSON = {
      company: {
        "code": testCompany.code,
        "name": editedData.name,
        "description": editedData.description
      }
    };

    const res = await request(app)
      .put(`${ROUTE}/${testCompany.code}`)
      .send(editedData);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(expectedJSON);
    expect(res.type).toBe(JSON);

  });

  it (`should return a 404 and the companies in the database 
        should remain unmodified if the company code is invalid`, async () => {

    // turn off console error message 
    const originalError = console.error;
    console.error = jest.fn(); // replace console.error with a Jest-mocked function

    const res = await request(app)
      .put(`${ROUTE}/INVALID_CODE`);

    expect(res.statusCode).toEqual(404);

    const companyRes = await request(app).get(ROUTE);
    const unmodifiedCompanies = {
      companies: [{
        "code": testCompany.code,
        "name": testCompany.name
      }]
    };

    expect(companyRes.body).toEqual(unmodifiedCompanies);

    console.error = originalError;

  });
});


describe(`DELETE ${ROUTE}/:code`, () => {
  it ("should delete the given company and return a confirmation message", async () => {

    const res = await request(app)
      .delete(`${ROUTE}/${testCompany.code}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({status: "deleted"});
    expect(res.type).toBe(JSON);

  });

  it (`should return a 404 and the companies in the database 
        should remain unmodified if the company code is invalid`, async () => {

    // turn off console error message 
    const originalError = console.error;
    console.error = jest.fn(); // replace console.error with a Jest-mocked function

    const res = await request(app)
      .delete(`${ROUTE}/INVALID_CODE`);

    expect(res.statusCode).toEqual(404);

    const companyRes = await request(app).get(ROUTE);
    const unmodifiedCompanies = {
      companies: [{
        "code": testCompany.code,
        "name": testCompany.name
      }]
    };

    expect(companyRes.body).toEqual(unmodifiedCompanies);

    console.error = originalError;

  });
});