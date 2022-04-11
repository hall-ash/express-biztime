// invoices routes for biztime app

const express = require('express');
const router = express.Router();
const db = require('../db');
const { throwErrorIfNotFound, getResults } = require('../helpers');

/**
 * Return all invoices as array of objects.
 */
router.get('/', async (req, res, next) => {
  try {
    const results = await db.query(`
      SELECT id, comp_code 
      FROM invoices
    `);

    const invoices = getResults(results);

    return res.json({ invoices });

  } catch (e) {
    return next(e);
  }
});

/**
 * Return given invoice object.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    // get the comPANY TO0 ******
    const invoiceResults = await db.query(`
      SELECT id, amt, paid, add_date, paid_date 
      FROM invoices
      WHERE id=$1
    `, [id]);

    throwErrorIfNotFound(id, invoiceResults);

    const companyResults = await db.query(`
      SELECT c.code, c.name, c.description
      FROM companies AS c
      INNER JOIN invoices AS i
      ON c.code=i.comp_code
      WHERE i.id=$1 
    `, [id]);
   
    const invoice = getResults(invoiceResults);
    invoice.company = getResults(companyResults);

    return res.json({ invoice });

  } catch (e) {
    return next(e);
  }
});

/**
 * Add an invoice.
 */
router.post('/', async (req, res, next) => {
  try {
    const { comp_code, amt } = req.body;

    const results = await db.query(`
      INSERT INTO invoices
      (comp_code, amt) VALUES ($1, $2)
      RETURNING id, comp_code, amt, paid, add_date, paid_date
    `, [comp_code, amt]);

    const invoice = getResults(results);

    return res.json({ invoice });
  } catch (e) {
    return next(e);
  }
});


/**
 * Update an invoice
 */
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amt } = req.body;

    const results = await db.query(`
      UPDATE invoices
      SET amt = $1
      WHERE id = $2
      RETURNING id, comp_code, amt, paid, add_date, paid_date
    `, [amt, id]);

    throwErrorIfNotFound(id, results);

    const invoice = getResults(results);

    return res.json({ invoice });
  } catch (e) {
    return next(e);
  }
});


/**
 * Delete an invoice.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const results = await db.query(`
      DELETE FROM invoices
      WHERE id = $1
      RETURNING id
    `, [id]);

    throwErrorIfNotFound(id, results);

    return res.json({ status: 'deleted' });

  } catch (e) {
    return next(e);
  }
});


module.exports = router;