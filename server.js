/** Server startup for BizTime. */


const app = require("./app");
const PORT = 3000;


app.listen(PORT, function () {
  console.log(`Listening on ${PORT}`);
});