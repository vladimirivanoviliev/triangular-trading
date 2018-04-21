// import express from 'express';
// import fs from 'fs';
import ReaderServer from './readerServer';

//TODO: read markets only once
//TODO: than start the regular reader at 2 seconds interval
const reader = new ReaderServer();

reader.start();

