#!/usr/bin/env node

// Get CLI arguments
const argv = require('minimist')(process.argv.slice(2))

// Get storage directory
const storage = `${require('temp-dir')}\\rosav`

// Prepare filesystem functions
const fs = require('fs')

// Prepare path joining procedures
const path = require('path')

// Prepare file requester
const request = require('request')

// Prepare time parser
const dayjs = require('dayjs')

// If storage directory doesn't exist
if (!fs.existsSync(storage)) {
    // Create storage directory
    fs.mkdirSync(storage)
}

// If hashlist doesn't exist or is out of date
if (!fs.existsSync(path.join(storage, "hashlist.txt"))) || request({
    url: 'https://api.github.com/repos/Richienb/virusshare-hashes/commits/master',
    method: 'GET',
    headers: { 'User-Agent': 'node.js' }
}, (error, response, body) => {
    // Get download date of hashlist
    let current = dayjs(fs.readFileSync(path.join(storage, "lastmodified.txt"), 'utf8'))
    // Get latest commit date of hashlist
    let now = dayjs(JSON.parse(body).commit.author.date, 'YYYY-MM-DDTHH:MM:SSZ')
    // Check if current is older than now
    return current < now
})) {
    // Download hashlist
    request({
        url: "https://raw.githubusercontent.com/Richienb/virusshare-hashes/master/virushashes.txt",
        method: 'GET',
        headers: { 'User-Agent': 'node.js' }
    }, (error, response, body) => {
        // Write the response to hashlist.txt
        fs.writeFile(path.join(storage, "hashlist.txt"), body, () => { })
    })
    request({
        url: 'https://api.github.com/repos/Richienb/virusshare-hashes/commits/master',
        method: 'GET',
        headers: { 'User-Agent': 'node.js' }
    }, (error, response, body) => {
        // Parse data
        let data = JSON.parse(body)
        // Write date to file
        fs.writeFile(path.join(storage, "lastmodified.txt"), data.commit.author.date, () => { })
    });
}

if(argv.hasOwnProperty('r')){
    console.log("Recursive Scanning")
}
if(argv.hasOwnProperty("n") {
    console.log("No scanning, just download definitions")
}
