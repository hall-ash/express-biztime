const ExpressError = require("./expressError");

// throw error if record does not exist
const throwErrorIfNotFound = (id, results) => {
  if (!results.rows.length) {
    throw new ExpressError(`Can't find record with primary key ${id}`, 404);
  }
};

const getResults = results => {
  return results.rows.length > 1 ? results.rows : results.rows[0];
}

module.exports = {
  throwErrorIfNotFound,
  getResults
};
