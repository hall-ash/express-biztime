process.env.NODE_ENV = 'test'; // connect to the test db

const request = require('supertest');

const app = require('../app');
const db = require('../db');

const ROUTE = '/industries';
const JSON = 'application/json';

let testIndustry;

beforeEach(async () => {
  const industryResult = await db.query(`
    INSERT INTO industries
    (code, industry)
    VALUES
    ('tech', 'Technology')
    RETURNING code, industry
  `);

  const companyResult = await db.query(`
    INSERT INTO companies
    (code, name, description) 
    VALUES 
    ('ibm', 'IBM', 'Big Blue')
    RETURNING code, name, description
  `);

  await db.query(`
    INSERT INTO companies_industries
    (comp_code, ind_code)
    VALUES 
    ('ibm', 'tech')
  `);

  testIndustry = industryResult.rows[0];
  testIndustry.companies = companyResult.rows.map(c => c.code);
});

afterEach(async () => {
  // clear tables
  const tables = ['companies', 'invoices', 'industries', 'companies_industries'];
  await Promise.all(tables.map(t => db.query(`DELETE FROM ${t}`)));
});

afterAll(async() => {
  await db.end(); // close db connection
});

describe(`POST ${ROUTE}`, () => {
  it("should create a new industry and return its data as JSON", async () => {
    const newIndustry = {
      code: "acct",
      industry: "Accounting"
    };

    const res = await request(app)
      .post(ROUTE)
      .send(newIndustry);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toEqual({ industry: newIndustry });
    expect(res.type).toBe(JSON);
  })
});

describe(`GET ${ROUTE}`, () => {
  it("should return a list containing the industry code and the company code(s) for 1 industry if no more than 1 industry exists", async () => {
    const res = await request(app).get(ROUTE);

    expect(res.statusCode).toEqual(200);
    expect(res.type).toBe(JSON);
    expect(res.body).toEqual({ industries: [{ code: testIndustry.code, companies: ['ibm'] }]})
  });

  it("should return a list containing the industry code and company code(s) for each industry if more than 1 industry exists", async () => {

    // add an industry
    const result = await db.query(
      `
      INSERT INTO industries
      (code, industry) VALUES ('acct', 'Accounting')
      RETURNING code, industry
      `
    );

    const newIndustry = result.rows[0];

    const industries = [testIndustry, newIndustry].map(i => {
      return { code: i.code, companies: i.companies ? i.companies : [] };
    });

    const res = await request(app).get(ROUTE);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toEqual({ industries });
    expect(res.type).toBe(JSON);

  });
});

describe(`GET ${ROUTE}/:code`, () => {
  it("should return the industry code and the companies that belong to it", async () => {
    const res = await request(app).get(`${ROUTE}/${testIndustry.code}`);
  
    expect(res.statusCode).toEqual(200);
    expect(res.type).toBe(JSON);
    expect(res.body).toEqual({
      industry: {
        code: testIndustry.code,
        companies: testIndustry.companies
      } 
     });
     
  });

  it("should return a 404 if the given industry cannot be found", async () => {
    // turn of console error message
    const originalError = console.error;
    console.error = jest.fn(); // replace console.error with a Jest-mocked function
    
    const res = await request(app).get(`${ROUTE}/INVALID_CODE`);

    expect(res.statusCode).toEqual(404);
    expect(res.type).toBe(JSON);
    
    console.error = originalError;
  });
});