// industries routes for biztime app
const express = require('express');
const router = express.Router();
const db = require('../db');
const { throwErrorIfNotFound, getResults } = require('../helpers');
const slugify = require('slugify');

 // get comp_codes for each industry
const getIndustryData = (industryResult) => {
    return industryResult.rows.map(async (industry) => {
      // find all companies within this industry
      const companiesResult = await db.query(
        `
        SELECT c.code
        FROM companies AS c
        INNER JOIN companies_industries AS ci
        ON c.code = ci.comp_code
        INNER JOIN industries AS i
        ON ci.ind_code = i.code
        WHERE i.code = $1
      `
      , [industry.code]);
  
      // get list of comp_codes
      industry.companies = companiesResult.rows.map(c => c.code);
      return industry;
    });
};

router.get('/', async (req, res, next) => {
  try {
    const industryResult = await db.query(`
      SELECT code
      FROM industries
    `);

    const industries = await Promise.all(getIndustryData(industryResult));

    return res.json({ industries });

  } catch (e) {
    return next(e);
  }
});

router.get('/:code', async (req, res, next) => {
  try {
    const { code } = req.params;

    const industryResult = await db.query(
      `
      SELECT code
      FROM industries
      WHERE code = $1
      `
    , [code]);

    throwErrorIfNotFound(code, industryResult);

    const industry = await Promise.all(getIndustryData(industryResult));

    // get the first industry obj
    return res.json({ industry: industry[0] });

  } catch (e) {
    return next(e);
  }
})

router.post('/', async (req, res, next) => {
  try {
    const { code, industry: name } = req.body;

    const result = await db.query(`
      INSERT INTO industries
      (code, industry)
      VALUES
      ($1, $2)
      RETURNING code, industry
    `, [slugify(code, { lower: true }), name]);

    const industry = getResults(result);

    return res.status(201).json({ industry });
  } catch (e) {
    return next(e);
  }
});

module.exports = router;