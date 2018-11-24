// import express from 'express';
// import fs from 'fs';
import ReaderServer from './readerServer';
const argv = require('yargs').argv;

console.log(argv);



//TODO: read markets only once
//TODO: than start the regular reader at 2 seconds interval
// if (false) {
const reader = new ReaderServer({ market: argv.market, currencies: argv.currencies });

reader.start();
// }

