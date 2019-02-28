#!/usr/bin/env node

// Path joining procedures
const path = require('path')

// File matcher
const glob = require("glob")

// Get CLI arguments
const args = require('minimist')(process.argv.slice(2))

// Set storage directory
const storage = args.data ? args.data : path.join(require('temp-dir'), "rosav")

// External file requester
const request = require('request')
const rprog = require('request-progress')

// Time parser
const dayjs = require('dayjs')

// MD5 from file
const MD5File = require('md5-file')

// Simplified console colours
const c = require('chalk')

// Prevent file overloads and provide filesystem functions
let realFs = require('fs')
let gracefulFs = require('graceful-fs')
gracefulFs.gracefulify(realFs)
const fs = require('graceful-fs')

// Progress bar
const CLIProgress = require('cli-progress')

// Line by line reader
const LineByLineReader = require('line-by-line')

// Bloom filter functionality
const { BloomFilter } = require('bloomfilter')

// If quiet mode activated
if (args.quiet === "true") {
    // Disable console logs
    console.log = () => { }
}

// Print ASCII text
console.log(`  ${c.blue("_____   ____   _____")}       ${c.red("__      __")}\r\n ${c.blue("|  __ \\ / __ \\ / ____|")}     ${c.red("/\\ \\    / /")}\r\n ${c.blue("| |__) | |  | | (___")}      ${c.red("/  \\ \\  / / ")}\r\n ${c.blue("|  _  /| |  | |\\___ \\")}    ${c.red("/ /\\ \\  / /")}  \r\n ${c.blue("| | \\ \\| |__| |____) |")}  ${c.red("/ ____ \\  /")}   \r\n ${c.blue("|_|  \\_\\\\____/|_____/")}  ${c.red("/_/    \\_/")}    \n`)

// If help executed
if (args.help) {
    console.log(c.cyan("rosav --update=true --scan=true --verbose=false --quiet=false --pathregex=/**/* --progressbar=true --action=<nothing, remove> --data=<temp dir> [folders or files]"))
    process.exit(0)
}

// If storage directory doesn't exist
if (!fs.existsSync(storage)) {

    // Create storage directory
    fs.mkdirSync(storage, { recursive: true })

    console.log(c.green("Data directory created."))
} else {
    console.log(c.green("Data directory found."))
}

// Display storage path
if (args.verbose === "true") {
    console.log(c.cyan(`Storage directory is ${storage}`))
}

const scanbar = new CLIProgress.Bar({}, CLIProgress.Presets.shades_classic)

// Error handler
const handleError = (err) => {
    if (verbose === "true") {
        throw err
    } else {
        console.log(c.red(`An error has occurred: ${err}`))
        process.exit(1)
    }

}

// Hash list
let hashes = new BloomFilter(
    16 * 512000000, // Number of bits to allocate
    32              // Number of hash functions
)

const startscan = () => {
    let done = 0

    const updateCLIProgress = () => {
        if (args.progressbar !== "false") {
            scanbar.increment(1)
            done += 1
            if (done >= scanbar.total) {
                scanbar.stop()
                process.exit(0)
            }
        }
    }

    const scan = (path) => {
        fs.lstat(path, (err, stats) => {
            if (err) {
                handleError(err)
            }
            // If path is not a directory
            if (!stats.isDirectory()) {
                MD5File(path, (err, hash) => {
                    if (err) {
                        handleError(err)
                    }
                    if (hashes.test(hash)) {
                        console.log(c.red(`${path} is dangerous!`))

                        if (args.action === "remove") {
                            fs.unlink(path, (err) => {
                                if (err) {
                                    handleError(err)
                                }
                                if (args.verbose === "true") {
                                    console.log(c.yellow(`${path} successfully deleted.`))
                                }
                            })
                        }
                        updateCLIProgress()
                    } else {
                        if (args.verbose === 'true') {
                            // Otherwise, if verbose is enabled
                            console.log(c.green(`${path} is safe.`))
                        }
                        updateCLIProgress()
                    }
                })
            } else {
                updateCLIProgress()
            }

        })

    }

    console.log(c.green("Starting scan..."))

    // For each path
    args._.forEach((i) => {
        if (!fs.existsSync(i)) {
            // If path doesn't exist
            console.log(c.yellow(`${i} doesn't exist!`))
        } else if (fs.lstatSync(i).isDirectory()) {
            // If path is a directory
            if (args.recursive === 'true') {
                glob(path.resolve(path.join(i, args.pathregex ? args.pathregex : "/**/*")), (err, files) => {
                    if (err) {
                        handleError(err)
                    }

                    if (args.progressbar !== "false") {
                        scanbar.start(files.length, 0)
                    }

                    files.forEach((file) => {
                        // If the MD5 hash is in the list
                        scan(path.resolve(i, file))
                    })
                })
            } else {
                fs.readdir(path.resolve(i), (err, files) => {
                    if (err) {
                        handleError(err)
                    }

                    if (args.progressbar !== "false") {
                        scanbar.start(files.length, 0)
                    }

                    files.forEach(file => {
                        // If the MD5 hash is in the list
                        scan(path.resolve(i, file))
                    })
                })
            }

        } else
            // If path is a file
            scan(path.resolve(__dirname, i))

    })
}

const prepscan = () => {

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

    console.log(c.green("Loading hashes..."))

    // Line reader
    let hlr = new LineByLineReader(path.join(storage, "hashlist.txt"), {
        encoding: 'utf8',
        skipEmptyLines: true
    })

    // Line reader error
    hlr.on('error', (err) => {
        handleError(err)
    })

    // New line from line reader
    hlr.on('line', (line) => {
        hashes.add(line)
    })

    // Line reader finished
    hlr.on('end', () => {
        startscan()
    })

}

// Request parameters
const requestParams = (url, json = false) => {
    return {
        url: url,
        json: json,
        gzip: true,
        method: 'GET',
        headers: {
            'User-Agent': 'rosav (nodejs)'
        }
    }
}

// If update is not disabled or hashlist doesn't exist
if (args.update !== "false" || !fs.existsSync(path.join(storage, "hashlist.txt"))) {
    // Check if online
    require('dns').lookup('google.com', (err) => {
        if (err && err.code == "ENOTFOUND") {
            console.log(c.red("You are not connected to the internet!"))
            process.exit(1)
        } else {
            handleError(err)
        }
    })

    // Define updater
    const update = () => {
        console.log(c.green("Updating hash list..."))

        // Download hashlist
        const dlbar = new CLIProgress.Bar({}, CLIProgress.Presets.shades_classic)
        rprog(request(requestParams("https://media.githubusercontent.com/media/Richienb/virusshare-hashes/master/virushashes.txt")))
            .on('progress', (state) => {
                if (args.progressbar !== "false") {
                    dlbar.start(state.size.total, state.size.transferred)
                }

            })
            .on('end', () => {
                dlbar.stop()
            })
            .pipe(fs.createWriteStream(path.join(storage, "hashlist.txt")))
        request(requestParams("https://api.github.com/repos/Richienb/virusshare-hashes/commits/master", true), (err, _, body) => {
            if (err) {
                handleError(err)
            }

            // Write date to file
            fs.writeFile(path.join(storage, "lastmodified.txt"), body.commit.author.date, () => { })
        })
    }
    // If hashlist exists
    if (fs.existsSync(path.join(storage, "hashlist.txt")) && args.update !== "true") {
        // If updates are enabled
        let quotaremaining

        // Request the GitHub API rate limit
        request(requestParams("https://api.github.com/rate_limit", true), (err, _, body) => {
            if (err) {
                handleError(err)
            }

            // Check the quota limit
            if (body.resources.core.remaining === 0) {
                console.log(c.yellow(`Maximum quota limit reached on the GitHub api. Updates will not work unless forced until ${dayjs(body.resources.core.reset).$d}`))
            }
            quotaremaining = !(body.resources.core.remaining === 0)
        })

        // If no API quota remaining
        if (quotaremaining) {
            return
        }

        let outdated

        // Check for the latest commit
        request({
            url: 'https://api.github.com/repos/Richienb/virusshare-hashes/commits/master',
            method: 'GET',
            json: true,
            gzip: true,
            headers: {
                'User-Agent': 'rosav (nodejs)'
            }
        }, (err, _, body) => {
            if (err) {
                handleError(err)
            }

            // Get download date of hashlist
            let current = dayjs(fs.readFileSync(path.join(storage, "lastmodified.txt"), 'utf8'))

            // Get latest commit date of hashlist
            let now = dayjs(body.commit.author.date, 'YYYY-MM-DDTHH:MM:SSZ')

            // Check if current is older than now
            outdated = current < now
        })

        if (outdated) {
            update()
            prepscan()
        } else {
            console.log(c.green("Hash list is up to date."))
            prepscan()
        }
    } else {
        // If hashlist doesn't exist
        update()
    }
} else {
    console.log(c.yellow("Hash list updates disabled."))
    prepscan()
}
