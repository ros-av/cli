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
const rprog = require('request-progress');

// Time parser
const dayjs = require('dayjs')

// MD5 from file
const md5File = require('md5-file')

// Simplified console colours
const c = require('chalk')

// Prevent file overloads and provide filesystem functions
let realFs = require('fs')
let gracefulFs = require('graceful-fs')
gracefulFs.gracefulify(realFs)
const fs = require('graceful-fs')

// Progress bar
const progressbar = require('cli-progress')
const scanbar = new progressbar.Bar({}, progressbar.Presets.shades_classic)

// Print ASCII text
console.log(`  ${c.blue("_____   ____   _____")}       ${c.red("__      __")}\r\n ${c.blue("|  __ \\ / __ \\ / ____|")}     ${c.red("/\\ \\    / /")}\r\n ${c.blue("| |__) | |  | | (___")}      ${c.red("/  \\ \\  / / ")}\r\n ${c.blue("|  _  /| |  | |\\___ \\")}    ${c.red("/ /\\ \\  / /")}  \r\n ${c.blue("| | \\ \\| |__| |____) |")}  ${c.red("/ ____ \\  /")}   \r\n ${c.blue("|_|  \\_\\\\____/|_____/")}  ${c.red("/_/    \\_/")}    \n`)

// If help executed
if (args.help) {
    console.log(c.cyan("rosav --update=true --scan=true --verbose=false --progressbar=true --action=<nothing, remove> --data=<temp dir> [folders or files]"))
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

if (args.verbose === "true") {
    console.log(c.cyan("Storage directory is " + storage))
}

// Add an error handler
const handleError = (err) => {
    console.log(c.red("An error has occurred: " + err))
    process.exit(1)
}

const startscan = () => {

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

    const hashes = fs.readFileSync(path.join(storage, "hashlist.txt"), 'utf8').split("\n")

    let done = 0

    const updateProgressBar = () => {
        if (args.progressbar !== "false") {
            scanbar.increment(1)
            done += 1
            if (done >= scanbar.total) {
                scanbar.stop()
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
                md5File(path, (err, hash) => {
                    if (err) {
                        handleError(err)
                    }
                    // If the hash is in the list
                    if (hashes.includes(hash)) {
                        console.log(c.red(`${path} is dangerous!`))

                        if (args.action === "remove") {
                            fs.unlink(path, (err) => {
                                if (err) {
                                    handleError(err)
                                }
                                if (args.verbose === "true") {
                                    console.log(c.yellow(`${path} successfully deleted.`))
                                }
                            });
                        }

                    } else if (args.verbose === 'true') {
                        // Otherwise, if verbose is enabled
                        console.log(c.green(`${path} is safe.`))
                    }
                    updateProgressBar()
                })
            } else {
                updateProgressBar()
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
                glob(path.resolve(path.join(i, "/**/*")), (err, files) => {
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

// If update is not disabled or hashlist doesn't exist
if (args.update !== "false" || !fs.existsSync(path.join(storage, "hashlist.txt"))) {
    // Define updater
    const update = () => {
        console.log(c.green("Updating hash list..."))
        // Download hashlist
        const dlbar = new progressbar.Bar({}, progressbar.Presets.shades_classic)
        rprog(request({
            url: "https://media.githubusercontent.com/media/Richienb/virusshare-hashes/master/virushashes.txt",
            method: 'GET',
            gzip: true,
            headers: {
                'User-Agent': 'rosav (nodejs)'
            }
        }, (err, _, body) => {
            if (err) {
                handleError(err)
            }

            // Write the response to hashlist.txt
            fs.writeFile(path.join(storage, "hashlist.txt"), body, (err) => {
                if (err) {
                    handleError(err)
                }

                console.log(c.green("Hash list updated."))

                startscan()
            })
        })).on('progress', (state) => {
            // The state is an object that looks like this:
            // {
            //     percent: 0.5,               // Overall percent (between 0 to 1)
            //     speed: 554732,              // The download speed in bytes/sec
            //     size: {
            //         total: 90044871,        // The total payload size in bytes
            //         transferred: 27610959   // The transferred payload size in bytes
            //     },
            //     time: {
            //         elapsed: 36.235,        // The total elapsed seconds since the start (3 decimals)
            //         remaining: 81.403       // The remaining seconds to finish (3 decimals)
            //     }
            // }
            dlbar.update((state.percent * 100).toFixed(2));
        })
            .on('end', function() {
                dlbar.stop()
            })
        request({
            url: 'https://api.github.com/repos/Richienb/virusshare-hashes/commits/master',
            method: 'GET',
            json: true,
            headers: {
                'User-Agent': 'rosav (nodejs)'
            }
        }, (err, _, body) => {
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
        request({
            url: 'https://api.github.com/rate_limit',
            method: 'GET',
            json: true,
            headers: {
                'User-Agent': 'rosav (nodejs)'
            }
        }, (err, _, body) => {
            if (err) {
                handleError(err)
            }

            // Check the quota limit
            if (body.resources.core.remaining === 0) {
                console.log(c.yellow("Maximum quota limit reached on the GitHub api. Updates will not work unless forced until " + dayjs(body.resources.core.reset).$d))
            }
            quotaremaining = !(body.resources.core.remaining === 0)
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
            json: true,
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
        } else {
            console.log(c.green("Hash list is up to date."))
        }
    } else {
        // If hashlist doesn't exist
        update()
    }
} else {
    console.log(c.yellow("Hash list updates disabled."))
    startscan()
}
