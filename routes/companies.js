// companies routes for biztime app
const express = require('express');
const router = express.Router();
const db = require('../db');
const ExpressError = require('../expressError');
const { throwErrorIfNotFound, getResults } = require('../helpers');
const slugify = require('slugify');

// get list of companies
router.get('/', async (req, res, next) => {
  try {
    const results = await db.query(`
      SELECT code, name
      FROM companies
      ORDER BY name
    `);

    const companies = results.rows;
    
    return res.json({ companies });
  } catch (e) {
    return next(e);
  }
});

router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    const companyResults = await db.query(`
      SELECT code, name, description
      FROM companies 
      WHERE code=$1`, [code]);

    throwErrorIfNotFound(code, companyResults);

    const invoiceResults = await db.query(`
      SELECT id
      FROM invoices 
      WHERE comp_code=$1
    `, [code]);
    
    const industryResults = await db.query(`
      SELECT i.industry
      FROM industries AS i
      INNER JOIN companies_industries AS ci
      ON i.code = ci.ind_code
      INNER JOIN companies AS c
      ON ci.comp_code = c.code
      WHERE c.code = $1
    `, [code]);

    const company = getResults(companyResults);
    // create array of invoice ids
    company.invoices = invoiceResults.rows.map(i => i.id);
    company.industries = industryResults.rows.map(i => i.industry);

    return res.json({ company });
  } catch (e) {
    return next(e);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { code, name, description } = req.body;
    

    const results = await db.query(`
      INSERT INTO companies
      (name, code, description) VALUES ($1, $2, $3)
      RETURNING code, name, description
    `, [name, slugify(code, { lower: true }), description]);

    const company = getResults(results);

    return res.status(201).json({ company });
  } catch (e) {
    return next(e);
  }
});

router.put('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;
    const { name, description } = req.body;

    const results = await db.query(`
      UPDATE companies
      SET name=$1, description=$2
      WHERE code=$3
      RETURNING code, name, description
    `, [name, description, code])

    throwErrorIfNotFound(code, results);

    const company = getResults(results);

    return res.json({ company });
  } catch (e) {
    return next(e);
  }
});

// add an industry to the company
router.patch('/:code/add-industry', async (req, res, next) => {
  try {
    const { code: comp_code } = req.params;
    const { ind_code } = req.body;

    await db.query(`
      INSERT INTO companies_industries
      (comp_code, ind_code)
      VALUES
      ($1, $2)
      RETURNING comp_code, ind_code
    `, [comp_code, ind_code]);

    const companyResults = await db.query(`
    SELECT code, name
    FROM companies 
    WHERE code=$1`, [comp_code]);

    const industryResults = await db.query(`
      SELECT i.industry
      FROM industries AS i
      INNER JOIN companies_industries AS ci
      ON i.code = ci.ind_code
      INNER JOIN companies AS c
      ON ci.comp_code = c.code
      WHERE c.code = $1
    `, [comp_code]);

    const company = getResults(companyResults);
    company.industries = industryResults.rows.map(i => i.industry);

    return res.json({ company });

  } catch (e) {
    // can't insert into companies_industries 
    // either ind_code or comp_code doesn't exist
    if (e.detail.includes('not present in table')) { 
      const msg = e.detail.includes('ind_code') ? 'Could not find industry' : 'Could not find company';
      return next(new ExpressError(msg, 404));
    }
    if (e.detail.includes('already exists')) {
      return next(new ExpressError(`The industry has already been added to this company.`, 400));
    }
    return next(e);
  }
})

router.delete('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    const results = await db.query(`
      DELETE FROM companies
      WHERE code=$1
      RETURNING code
    `, [code]);

    throwErrorIfNotFound(code, results);

    return res.json({ status: 'deleted' });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;