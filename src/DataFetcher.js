const unirest = require("unirest");
const fs = require("fs");

// const req = unirest(
//    "GET",
//    "https://apidojo-yahoo-finance-v1.p.rapidapi.com/stock/v2/get-historical-data"
// );

// req.query({
//    period1: "1263513600",
//    period2: "1610919989",
//    symbol: "EL4C.DE",
//    frequency: "1d",
//    filter: "history",
// });

// req.headers({
//    "x-rapidapi-key": "f1f835f039msh5d889b09dbf1b6cp1d30f8jsn4576b63bef9b",
//    "x-rapidapi-host": "apidojo-yahoo-finance-v1.p.rapidapi.com",
//    useQueryString: true,
// });

// req.end(function (res) {
//    if (res.error) throw new Error(res.error);
//    // console.log("res :>> ", JSON.stringify(res.body));

//    // convert JSON object to string
//    const data = JSON.stringify(res.body);

//    // write JSON string to a file
//    fs.writeFile("history.json", data, (err) => {
//       if (err) {
//          throw err;
//       }
//       console.log("JSON data is saved.");
//    });
// });

export function getHistory() {
   let result = null;

   fs.readFile("history.json", "utf-8", (err, data) => {
      if (err) {
         throw err;
      }

      // parse JSON object
      result = JSON.parse(data.toString());
   });

   return result;
}
