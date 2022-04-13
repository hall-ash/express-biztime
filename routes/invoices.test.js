process.env.NODE_ENV = 'test'; // connect to the test db

const request = require('supertest');

const app = require('../app');
const db = require('../db');

const ROUTE = '/invoices';
const JSON = 'application/json';
let testInvoice;
let testCompany;

beforeEach(async () => {

  // add company to db
  const companyResult = await db.query(`
    INSERT INTO companies
    (code, name, description)
    VALUES ('ibm', 'IBM', 'Big Blue')
    RETURNING code, name, description
  `);

  testCompany = companyResult.rows[0];

  const invoiceResult = await db.query(`
    INSERT INTO invoices
    (comp_code, amt, paid, paid_date)
    VALUES ($1, 100, true, '2018-01-01')
    RETURNING id, amt, paid, add_date, paid_date, comp_code
  `, [testCompany.code]);

  testInvoice = invoiceResult.rows[0];
  testInvoice.company = testCompany;
});

afterEach(async () => {
  await db.query('DELETE FROM invoices'); // clear invoices table
  await db.query('DELETE FROM companies'); // clear companies table
});

afterAll(async () => {
  await db.end(); // close db connection
});

describe(`GET ${ROUTE}`, () => {
  it("should return a list containing the JSON data for 1 invoice if no more than 1 invoice exists", async () => {
    const res = await request(app).get(ROUTE);
    const expectedJSON = {
      invoices: [{
        "id": testInvoice.id,
        "comp_code": testInvoice.comp_code
      }]
    };

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual(expectedJSON);
    expect(res.type).toBe(JSON);
  });
  
  it("should return a list containing the JSON data for each invoice if more than 1 invoice exists", async () => {
    // add an invoice
    const result = await db.query(`
      INSERT INTO invoices
      (comp_code, amt, paid, paid_date)
      VALUES ($1, 100, false, null)
      RETURNING id, amt, paid, add_date, paid_date, comp_code
    `, [testCompany.code]);
    const newInvoice = result.rows[0];

    const invoices = [testInvoice, newInvoice].map(i => ({"id": i.id, "comp_code": i.comp_code}));
    
    const res = await request(app).get(ROUTE);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ invoices });
    expect(res.type).toBe(JSON);
  });
});

describe(`GET ${ROUTE}/:id`, () => {
  it ("should return an invoice as JSON", async () => {
    const res = await request(app).get(`${ROUTE}/${testInvoice.id}`);

    expect(res.statusCode).toEqual(200);

    expect(res.body).toEqual({invoice: {
      id: testInvoice.id,
      amt: testInvoice.amt,
      paid: testInvoice.paid,
      add_date: expect.any(String),
      paid_date: expect.any(String),
      company: testInvoice.company
    }});
   
    expect(res.type).toBe(JSON);
  });

  it (`should return a 404 and the invoices in the database 
        should remain unmodified if the invoice id is invalid`, async () => {

    // turn off console error message 
    const originalError = console.error;
    console.error = jest.fn(); // replace console.error with a Jest-mocked function

    const res = await request(app)
      .get(`${ROUTE}/0`);

    expect(res.statusCode).toEqual(404);

    const invoiceRes = await request(app).get(ROUTE);
    const unmodifiedInvoices = {
      invoices: [{
        "id": testInvoice.id,
        "comp_code": testInvoice.comp_code
      }]
    };

    expect(invoiceRes.body).toEqual(unmodifiedInvoices);

    console.error = originalError;

  });
});

describe(`POST ${ROUTE}`, () => {
  it ("should create a new invoice and return its data as JSON", async () => {
    const newInvoice = {
      "comp_code": testCompany.code,
      "amt": 9999
    };

    const res = await request(app)
      .post(ROUTE)
      .send(newInvoice);

    expect(res.statusCode).toEqual(201);
    expect(res.type).toBe(JSON);
    expect(res.body).toEqual({
      invoice: {
        id: expect.any(Number),
        comp_code: newInvoice.comp_code,
        amt: newInvoice.amt,
        paid: false,
        add_date: expect.any(String),
        paid_date: null
      }
    });
    

  });
});


describe(`PATCH ${ROUTE}/:id`, () => {
  it ("should update an existing invoice's amt and return the updated data as JSON", async () => {
    const updatedData = { amt: 5555 };

    const res = await request(app)
      . patch(`${ROUTE}/${testInvoice.id}`)
      .send(updatedData);

    expect(res.statusCode).toEqual(200);
    expect(res.type).toBe(JSON);

    expect(res.body).toEqual({
      invoice: {
        id: testInvoice.id,
        comp_code: testCompany.code,
        amt: updatedData.amt,
        paid: testInvoice.paid,
        add_date: expect.any(String),
        paid_date: expect.any(String)
      }
    });

  });

  it ("should update an existing invoice's paid value to false, update the paid_date to null, and return the updated data as JSON", async () => {

    const res = await request(app)
      . patch(`${ROUTE}/${testInvoice.id}`)
      .send({ paid: false });

    expect(res.statusCode).toEqual(200);
    expect(res.type).toBe(JSON);

    expect(res.body).toEqual({
      invoice: {
        id: testInvoice.id,
        comp_code: testCompany.code,
        amt: testInvoice.amt,
        paid: false,
        add_date: expect.any(String),
        paid_date: null
      }
    });
  });

  it("should update the existing invoice's paid value to true, update the paid_date to the current date, and return the updated data as JSON", async () => {
    
    // testInvoice is paid so send a request to unpay it
    await request(app)
      . patch(`${ROUTE}/${testInvoice.id}`)
      .send({ paid: false });

    // set testInvoice back to paid
    const res = await request(app)
    . patch(`${ROUTE}/${testInvoice.id}`)
    .send({ paid: true });

    expect(res.statusCode).toEqual(200);
    expect(res.type).toBe(JSON);

    expect(res.body).toEqual({
      invoice: {
        id: testInvoice.id,
        comp_code: testCompany.code,
        amt: testInvoice.amt,
        paid: true,
        add_date: expect.any(String),
        paid_date: expect.any(String)
      }
    });
  })

  it (`should return a 404 and the invoices in the database 
        should remain unmodified if the invoice id is invalid`, async () => {

    // turn off console error message 
    const originalError = console.error;
    console.error = jest.fn(); // replace console.error with a Jest-mocked function

    const res = await request(app)
      .get(`${ROUTE}/0`);

    expect(res.statusCode).toEqual(404);

    const invoiceRes = await request(app).get(ROUTE);
    const unmodifiedInvoices = {
      invoices: [{
        "id": testInvoice.id,
        "comp_code": testInvoice.comp_code
      }]
    };

    expect(invoiceRes.body).toEqual(unmodifiedInvoices);

    console.error = originalError;

  });
});


describe(`DELETE ${ROUTE}/:id`, () => {
  it ("should delete the given invoice and return a confirmation message", async () => {

    const res = await request(app)
      .delete(`${ROUTE}/${testInvoice.id}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({status: "deleted"});
    expect(res.type).toBe(JSON);

  });

  it (`should return a 404 and the invoices in the database 
        should remain unmodified if the invoice id is invalid`, async () => {

    // turn off console error message 
    const originalError = console.error;
    console.error = jest.fn(); // replace console.error with a Jest-mocked function

    const res = await request(app)
      .get(`${ROUTE}/0`);

    expect(res.statusCode).toEqual(404);

    const invoiceRes = await request(app).get(ROUTE);
    const unmodifiedInvoices = {
      invoices: [{
        "id": testInvoice.id,
        "comp_code": testInvoice.comp_code
      }]
    };

    expect(invoiceRes.body).toEqual(unmodifiedInvoices);

    console.error = originalError;

  });
});
