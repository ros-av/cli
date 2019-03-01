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

// Provide improved filesystem functions
const _realFs = require('fs')
const _gracefulFs = require('graceful-fs')
_gracefulFs.gracefulify(_realFs)
const fs = require('graceful-fs')

// Progress indicators
const CLIProgress = require('cli-progress')
const CLISpinner = require('cli-spinner').Spinner;

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

    console.log(c.green("Data directory created"))
} else {
    console.log(c.green("Data directory found"))
}

// Display storage path
if (args.verbose === "true") {
    console.log(c.magenta(`Storage directory is ${storage}`))
}

// Scanning progress bar
const progressbar = new CLIProgress.Bar({ format: c.cyan(' {bar} {percentage}% | ETA: {eta}s | {value}/{total}') }, CLIProgress.Presets.shades_classic)

// Error handler
const handleError = (err) => {
    if (args.verbose === "true") {
        // Throw native error
        throw err
    } else {
        // Throw custom error
        console.err(c.red(`An error has occurred: ${err}`))
    }

}

// Hash list
let hashes = new BloomFilter(
    16 * 512000000, // Number of bits to allocate
    32              // Number of hash functions
)

const startscan = () => {
    let done = 0

    // Increment the scan bar progress
    const updateCLIProgress = () => {
        if (args.progressbar !== "false") {
            progressbar.increment(1)
            done += 1
            if (done >= progressbar.total) {
                progressbar.stop()
                console.log(c.green("Scan complete"))
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
                // Get the MD5 of a file
                MD5File(path, (err, hash) => {
                    if (err) {
                        handleError(err)
                    }
                    // If the hash is in the list
                    if (hashes.test(hash)) {
                        console.log(c.red(`${path} is dangerous!`))

                        if (args.action === "remove") {
                            // Delete the file
                            fs.unlink(path, (err) => {
                                if (err) {
                                    handleError(err)
                                }
                                if (args.verbose === "true") {
                                    // If verbose is enabled
                                    console.log(c.green(`${path} successfully deleted.`))
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

    console.log(c.cyan("Scanning..."))

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

                    // If progressbar enabled
                    if (args.progressbar !== "false") {
                        // Start progressbar
                        progressbar.start(files.length, 0)
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

                    // If progressbar enabled
                    if (args.progressbar !== "false") {
                        // Start progressbar
                        progressbar.start(files.length, 0)
                    }

                    // For each file
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

    const spinner = new CLISpinner(c.cyan("Loading hashes %s (This may take a few minutes)"))
    spinner.setSpinnerString('⣾⣽⣻⢿⡿⣟⣯⣷')
    spinner.start()

    // Line reader
    const hlr = new LineByLineReader(path.join(storage, "hashlist.txt"), {
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
        spinner.stop()
        console.log(c.green('\nFinished loading hashes'))
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

    // Define updater
    const update = () => {
        console.log(c.cyan("Updating hash list..."))

        // Download hashlist
        rprog(request(requestParams("https://media.githubusercontent.com/media/Richienb/virusshare-hashes/master/virushashes.txt")))
            .on('progress', (state) => {
                if (args.progressbar !== "false") {
                    progressbar.start(state.size.total, state.size.transferred)
                }

            })
            .on('end', () => {
                progressbar.stop()
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

    // Check if online
    require('dns').lookup('google.com', (err) => {
        if (err && err.code == "ENOTFOUND") {
            console.log(c.red("You are not connected to the internet!"))
            process.exit(1)
        } else if (err) {
            handleError(err)
        } else {
            // If hashlist exists
            if (fs.existsSync(path.join(storage, "hashlist.txt")) && args.update !== "true") {

                // Request the GitHub API rate limit
                request(requestParams("https://api.github.com/rate_limit", true), (err, _, body) => {
                    if (err) {
                        handleError(err)
                    }

                    // Check the quota limit
                    if (body.resources.core.remaining === 0) {
                        // If no API quota remaining
                        console.log(c.yellow(`Maximum quota limit reached on the GitHub api. Updates will not work unless forced until ${dayjs(body.resources.core.reset).$d}`))
                        prepscan()
                    } else {
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
                            const current = dayjs(fs.readFileSync(path.join(storage, "lastmodified.txt"), 'utf8'))

                            // Get latest commit date of hashlist
                            const now = dayjs(body.commit.author.date, 'YYYY-MM-DDTHH:MM:SSZ')

                            // Check if current is older than now
                            if (current < now) {
                                update()
                            } else {
                                console.log(c.green("Hash list is up to date"))
                            }
                            prepscan()
                        })
                    }
                })

            } else {
                // If hashlist doesn't exist
                update()
            }
        }
    })

} else {
    console.log(c.yellow("Hash list updates disabled"))
    prepscan()
}
