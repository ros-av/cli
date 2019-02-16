#!/usr/bin/env node

// Path joining procedures
const path = require('path')

// File matcher
const glob = require("glob")

// Get CLI arguments
const args = require('minimist')(process.argv.slice(2))

// Set storage directory
const storage = args.data ? args.data : path.join(require('temp-dir'), "rosav")

// Filesystem functions
const fs = require('fs')

// External file requester
const request = require('request')

// Time parser
const dayjs = require('dayjs')

// MD5 from file
const md5File = require('md5-file')

// Simplified console colours
const c = require('chalk')

// Print ASCII text
console.log(`  ${c.blue("_____   ____   _____")}       ${c.red("__      __")}\r\n ${c.blue("|  __ \\ \/ __ \\ \/ ____|")}     ${c.red("\/\\ \\    \/ \/")}\r\n ${c.blue("| |__) | |  | | (___")}      ${c.red("\/  \\ \\  \/ \/ ")}\r\n ${c.blue("|  _  \/| |  | |\\___ \\")}    ${c.red("\/ \/\\ \\ \\\/ \/")}  \r\n ${c.blue("| | \\ \\| |__| |____) |")}  ${c.red("\/ ____ \\  \/")}   \r\n ${c.blue("|_|  \\_\\\\____\/|_____\/")}  ${c.red("\/_\/    \\_\\\/")}    \n`)

// If help executed
if (args.help) {
    console.log(c.cyan("rosav --update=true --scan=true --verbose=false --data=<temp dir> [folders or files]"))
    process.exit(0)
}

// If storage directory doesn't exist
if (!fs.existsSync(storage)) {

    // Create storage directory
    fs.mkdirSync(storage)

    console.log(c.green("Data directory created."))
} else {
    console.log(c.green("Data directory found."))
}

// If update is not disabled or hashlist doesn't exist
if (args.update !== "false" || !fs.existsSync(path.join(storage, "hashlist.txt"))) {
    // Define updater
    const update = () => {
        console.log(c.green("Updating hash list..."))
        // Download hashlist
        request({
            url: "https://raw.githubusercontent.com/Richienb/virusshare-hashes/master/virushashes.txt",
            method: 'GET',
            headers: {
                'User-Agent': 'rosav (nodejs)'
            }
        }, (error, response, body) => {
            // Write the response to hashlist.txt
            fs.writeFile(path.join(storage, "hashlist.txt"), body, () => { })
        })
        request({
            url: 'https://api.github.com/repos/Richienb/virusshare-hashes/commits/master',
            method: 'GET',
            headers: {
                'User-Agent': 'rosav (nodejs)'
            }
        }, (error, response, body) => {
            // Parse data
            let data = JSON.parse(body)
            // Write date to file
            fs.writeFile(path.join(storage, "lastmodified.txt"), data.commit.author.date, () => { })
        })

        console.log(c.green("Hash list updated."))
    }
    // If hashlist exists
    if (fs.existsSync(path.join(storage, "hashlist.txt"))) {
        // If updates are enabled
        if (args.update === "true") {
            update()
        } else {
            let quotaremaining

            // Request the GitHub API rate limit
            request({
                url: 'https://api.github.com/rate_limit',
                method: 'GET',
                headers: {
                    'User-Agent': 'rosav (nodejs)'
                }
            }, (error, response, body) => {
                // Parse the response as JSON
                let data = JSON.parse(body)

                // Check the quota limit
                if (data.resources.core.remaining === 0) {
                    console.log(c.yellow("Maximum quota limit reached on the GitHub api. Updates will not work unless forced until " + dayjs(data.resources.core.reset).$d))
                }
                quotaremaining = !(data.resources.core.remaining === 0)
            })

            // If API quota remaining
            if (quotaremaining) {
                return
            }

            let outdated

            // Check for the latest commit
            request({
                url: 'https://api.github.com/repos/Richienb/virusshare-hashes/commits/master',
                method: 'GET',
                headers: {
                    'User-Agent': 'rosav (nodejs)'
                }
            }, (error, response, body) => {

                // Get download date of hashlist
                let current = dayjs(fs.readFileSync(path.join(storage, "lastmodified.txt"), 'utf8'))

                // Get latest commit date of hashlist
                let now = dayjs(JSON.parse(body).commit.author.date, 'YYYY-MM-DDTHH:MM:SSZ')

                // Check if current is older than now
                outdated = current < now
            })

            if (outdated) {
                update()
            } else {
                console.log(c.green("Hash list is up to date."))
            }
        }
    }
} else {
    console.log(c.yellow("Hash list updates disabled."))
}

// If scanning disabled
if (args.scan === 'false') {
    console.log(c.red("Scanning disabled."))
    process.exit(0)
}

// If no paths specified
if (!args._[0]) {

    // Set to current directory
    args._ = [__dirname]
}

const hashes = fs.readFileSync(path.join(storage, "hashlist.txt"), 'utf8').split("\n")

const scan = (file) => {
    if (!(fs.lstatSync(file).isDirectory()) && hashes.includes(md5File.sync(file))) {
        console.log(c.red(`${file} is dangerous!`))
    } else
        // If verbose is enabled
        if (args.verbose === 'true' && (!(fs.lstatSync(file).isDirectory()))) {
            console.log(c.green(`${file} is safe.`))
        }
}

// For each path
args._.forEach((i) => {
    if (!fs.existsSync(i)) {
        // If path doesn't exist
        console.log(c.yellow(`${i} doesn't exist!`))
    } else if (fs.lstatSync(i).isDirectory()) {
        // If path is a directory
        if (args.recursive === 'true') {
            glob(path.resolve(path.join(i, "/**/*")), (err, files) => {
                files.forEach((file) => {
                    // If the MD5 hash is in the list
                    scan(path.resolve(i, file))
                })
            })
        } else {
            fs.readdir(path.resolve(i), (err, files) => {
                files.forEach(file => {
                    // If the MD5 hash is in the list
                    scan(path.resolve(i, file))
                })
            })
        }

    } else
        // If path is a file

        // If the MD5 hash is in the list
        if (hashes.includes(md5File.sync(path.resolve(__dirname, i)))) {
            console.log(c.red(`${i} is dangerous!`))
        } else
            // If verbose is enabled
            if (args.verbose === 'true') {
                console.log(c.green(`${i} is safe.`))
            }

})
