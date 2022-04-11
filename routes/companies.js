// companies routes for biztime app
const express = require('express');
const router = express.Router();
const db = require('../db');
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

    const companies = getResults(results);
    
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
    

    const company = getResults(companyResults);
    // create array of invoice ids
    company.invoices = invoiceResults.rows.map(i => i.id);

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

router.delete('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    const results = await db.query(`
      DELETE FROM companies
      WHERE code=$1
    `, [code]);

    throwErrorIfNotFound(code, results);

    return res.json({ status: 'deleted' });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;