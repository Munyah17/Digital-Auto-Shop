const c = require("./crawler");
const html = `<html><script id="__NEXT_DATA__" type="application/json">{"props":{"pageProps":{"products":[{"name":"Test Phone","price":"1299.99","url":"/p/test","image":"/img.jpg","category":"Electronics"}]}}}</script></html>`;
const p = c.parseProducts(html, "https://www.takealot.com/all-electronics");
console.log("parsed:", JSON.stringify(p));
console.log("converted:", c.convertPrice(1299.99, { currency: { rate: 0.054 }, markupPct: 15 }));
console.log("cat:", c.mapCategory("Electronics", { categoryMap: { electronics: "phones" }, defaultCategory: "general" }));
