#!/usr/bin/env node

// Get CLI arguments
const argv = require('minimist')(process.argv.slice(2))

// Get storage directory
const storage = `${require('temp-dir')}\\rosav`

// Prepare filesystem functions
const fs = require('fs')

// Prepare file requester
const request = require('request')

// Prepare time parser
const { DateTime } = require('luxon');

// If storage directory doesn't exist
if (!fs.existsSync(storage)) {
    // Create storage directory
    fs.mkdirSync(storage)
}

// If hashlist doesn't exist or is out of date
if (!fs.existsSync(`${storage}\\hashlist.txt`) || request({
    url: 'https://api.github.com/repos/Richienb/virusshare-hashes/commits/master',
    method: 'GET',
    headers: { 'User-Agent': 'node.js' }
}, (error, response, body) => {
    let filecontent
    fs.readFile(`${storage}\\lastmodified.txt`, (err, data) => {
        if (err) throw err;
        filecontent = data
        console.log(data)
    })
    let data = JSON.parse(body)
    // console.log(filecontent)
    // console.log(DateTime.fromFormat(filecontent, 'yyyy-mm-ddThh:mm:ssZ'))
    return Date.parse(content) < Date.parse(data.commit.author.date)
})) {
    // Download hashlist
    request({
        url: "https://raw.githubusercontent.com/Richienb/virusshare-hashes/master/virushashes.txt",
        method: 'GET',
        headers: { 'User-Agent': 'node.js' }
    }, (error, response, body) => {
        fs.writeFile(`${storage}\\hashlist.txt`, body, () => { })
    })
    request({
        url: 'https://api.github.com/repos/Richienb/virusshare-hashes/commits/master',
        method: 'GET',
        headers: { 'User-Agent': 'node.js' }
    }, (error, response, body) => {
        let data = JSON.parse(body)
        fs.writeFile(`${storage}\\lastmodified.txt`, data.commit.author.date, () => { })
    });
}
// // If hashlist exists
// else {
//
// }
