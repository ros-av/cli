#!/usr/bin/env node

// Path joining procedures
const path = require("path")

// Get CLI arguments
const args = require("commander")
    .description("A CLI that scans your files for matches to the VirusShare database.")
    .usage("<options> <files and directories>")
    .option("-u, --update <boolean>", "Hash list updates", null)
    .option("-s, --scan <boolean>", "Scanning", true)
    .option("-v, --verbose <boolean>", "Verbose output", false)
    .option("-q, --quiet <boolean>", "No output", false)
    .option("-r, --recursive <boolean>", "Recursive file scanning", false)
    .option("-e, --regex <string>", "Regex for recursive directory file matching", "/**/*")
    .option("-p, --progress <boolean>", "Progress bars and spinners", true)
    .option("-a, --action <string>", "Action to perform on dangerous files (nothing, remove, quarrantine)", true)
    .option("-d, --data <string>", "Directory to store files", path.join(require("temp-dir"), "rosav"))
    .parse(process.argv)

// Object boolean normalizer
const normalizeObject = (obj) => {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
        if (typeof obj[keys[i]] === "string" && ["true", "True", "false", "False"].includes(obj[keys[i]])) {
            obj[keys[i]] = obj[keys[i]].toLowerCase() === "true"
        }
    }
}

// Normalize CLI arguments
normalizeObject(args)

// User agent for requests
const userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.108 Safari/537.36"

// Regular request
const request = require("request").defaults({
    gzip: true,
    method: "GET",
    headers: {
        "User-Agent": userAgent,
    },
})

// Request for the GitHub api
const githubapi = request.defaults({
    json: true,
    headers: {
        "Accept": "application/vnd.github.v3+json",
    },
})

const rprog = require("request-progress")

// Time parser
const dayjs = require("dayjs")

// MD5 from file
const MD5File = require("md5-file")

// Simplified console colours
const c = require("chalk")

// Provide improved filesystem functions
const fs = require("graceful-fs").gracefulify(require("fs"))

// Progress indicators
const CLIProgress = require("cli-progress")
const CLISpinner = require("cli-spinner").Spinner

// Line by line reader
const LineByLineReader = require("line-by-line")

// Bloom filter functionality
const {
    BloomFilter
} = require("bloomfilter")

// If quiet mode activated
if (args.quiet) {
    // Disable console logs
    console.log = () => {}
}

// Print ASCII text
console.log(`  ${c.blue("_____   ____   _____")}       ${c.red("__      __")}\r\n ${c.blue("|  __ \\ \/ __ \\ \/ ____|")}     ${c.red("\/\\ \\    \/ \/")}\r\n ${c.blue("| |__) | |  | | (___")}      ${c.red("\/  \\ \\  \/ \/")} \r\n ${c.blue("|  _  \/| |  | |\\___ \\")}    ${c.red("\/ \/\\ \\ \\\/ \/")}  \r\n ${c.blue("| | \\ \\| |__| |____) |")}  ${c.red("\/ ____ \\  \/")}   \r\n ${c.blue("|_|  \\_\\\\____\/|_____\/")}  ${c.red("\/_\/    \\_\\\/")}\n`)

// If storage directory doesn't exist
if (!fs.existsSync(args.data)) {

    // Create storage directory
    fs.mkdirSync(args.data, {
        recursive: true
    })

    console.log(c.green("Data directory created"))
} else console.log(c.green("Data directory found"))

// Display storage path
if (args.verbose) console.log(c.magenta(`Storage directory is ${args.data}`))

// Scanning progress bar
const progressbar = new CLIProgress.Bar({
    format: c.cyan(" {bar} {percentage}% | ETA: {eta}s | {value}/{total}")
}, CLIProgress.Presets.shades_classic)

// Error handler
const handleError = (err) => {
    // If verbose enabled throw native error
    if (args.verbose) throw err

    // Otherwise, throw custom error
    else console.error(c.red(`An error has occurred: ${err}`))
}

const bestForBloom = ((n, p) => {
    const m = Math.ceil((n * Math.log(p)) / Math.log(1 / (2 ** Math.log(2))))
    const k = Math.round((m / n) * Math.log(2))
    return {
        m: m,
        k: k
    }
})(33226750, 1e-10)

// Hash list
let hashes = new BloomFilter(
    bestForBloom.m, // Number of bits to allocate
    bestForBloom.k // Number of hash functions
)

const startscan = () => {
    let done = 0

    // Increment the scan bar progress
    const updateCLIProgress = () => {
        if (args.progress) {
            progressbar.increment(1)
            done += 1
            if (done >= progressbar.total) {
                progressbar.stop()
                console.log(c.green("Scan complete"))
                process.exit(0)
            }
        }
    }

    const scan = (file) => {
        fs.lstat(file, (err, stats) => {
            if (err) {
                handleError(err)
            }
            // If path is not a directory
            if (!stats.isDirectory()) {
                // Get the MD5 of a file
                MD5File(file, (err, hash) => {
                    if (err) {
                        handleError(err)
                    }
                    // If the hash is in the list
                    if (hashes.test(hash)) {
                        console.log(c.red(`${file} is dangerous!`))

                        if (args.action === "remove") {
                            // Delete the file
                            fs.unlink(file, (err) => {
                                if (err) {
                                    handleError(err)
                                }
                                if (args.verbose) {
                                    // If verbose is enabled
                                    console.log(c.green(`${file} successfully deleted.`))
                                }
                            })
                        } else if (args.action === "quarantine") {
                            fs.rename(file, path.resolve(path.join(args.data, "quarantine"), path.basename(file)), (err) => {
                                if (err) {
                                    handleError(err)
                                }
                                if (args.verbose) {
                                    // If verbose is enabled
                                    console.log(c.green(`${file} successfully quarantined.`))
                                }
                            })
                        }
                        updateCLIProgress()
                    } else {
                        if (args.verbose) {
                            // Otherwise, if verbose is enabled
                            console.log(c.green(`${path} is safe.`))
                        }
                        updateCLIProgress()
                    }
                })
            } else updateCLIProgress()
        })
    }

    console.log(c.cyan("Scanning..."))

    // For each path
    args.args.forEach((i) => {
        if (!fs.existsSync(i)) {
            // If path doesn't exist
            console.log(c.yellow(`${i} doesn't exist!`))
        } else if (fs.lstatSync(i).isDirectory()) {
            // If path is a directory
            if (args.recursive) {
                require("glob")(path.resolve(path.join(i, args.regex)), {
                    nodir: true
                }, (err, files) => {
                    if (err) handleError(err)

                    // If the progresbar is enabled, start it
                    if (args.progress) progressbar.start(files.length, 0)

                    // For each file, check if it is in the list
                    files.forEach((file) => scan(path.resolve(i, file)))
                })
            } else {
                fs.readdir(path.resolve(i), (err, files) => {
                    if (err) handleError(err)

                    // If the progresbar is enabled, start it
                    if (args.progress) progressbar.start(files.length, 0)

                    // For each file, check if it is in the list
                    files.forEach(file => scan(path.resolve(i, file)))
                })
            }
        } else
            // If path is a file
            scan(path.resolve(__dirname, i))
    })
}

const prepscan = () => {
    // If scanning disabled
    if (!args.scan) {
        console.log(c.red("Scanning disabled."))
        process.exit(0)
    }

    const spinner = new CLISpinner(c.cyan("Loading hashes %s (This may take a few minutes)"))
    spinner.setSpinnerString("⣾⣽⣻⢿⡿⣟⣯⣷")
    spinner.start()

    // Line reader
    const hlr = new LineByLineReader(path.join(args.data, "hashlist.txt"), {
        encoding: "utf8",
        skipEmptyLines: true
    })

    // Line reader error
    hlr.on("error", (err) => handleError(err))

    // New line from line reader
    hlr.on("line", (line) => hashes.add(line))

    // Line reader finished
    hlr.on("end", () => {
        spinner.stop()
        console.log(c.green("\nFinished loading hashes"))
        startscan()
    })

}

// Define updater
const update = () => {
    console.log(c.cyan("Updating hash list..."))

    // Download latest commit date of hash list
    githubapi("https://api.github.com/repos/Richienb/virusshare-hashes/commits/master", (err, _, {
        commit
    }) => {
        if (err) handleError(err)

        // Write date to file
        fs.writeFile(path.join(args.data, "lastmodified.txt"), commit.author.date, () => {})
    })

    // Download hashlist
    rprog(request("https://media.githubusercontent.com/media/Richienb/virusshare-hashes/master/virushashes.txt"))
        .on("progress", (state) => {
            if (args.progress) progressbar.start(state.size.total, state.size.transferred)
        })
        .on("end", () => {
            progressbar.stop()
            prepscan()
        })
        .pipe(fs.createWriteStream(path.join(args.data, "hashlist.txt")))
}

// If updates are forced or files don't exist
if (args.update || !fs.existsSync(path.join(args.data, "hashlist.txt")) || !fs.existsSync(path.join(args.data, "lastmodified.txt"))) update()

// If hashlist does exist and updates are not disabled
else if (args.update !== false && fs.existsSync(path.join(args.data, "hashlist.txt")) && fs.existsSync(path.join(args.data, "lastmodified"))) {

    // Check if online
    require("dns").lookup("google.com", (err) => {
        if (err && err.code == "ENOTFOUND") {
            console.log(c.red("You are not connected to the internet!"))
            process.exit(1)
        } else if (err) handleError(err)
        else {
            // If hashlist exists or update not forced
            if (!args.update && fs.existsSync(path.join(args.data, "hashlist.txt"))) {

                // Request the GitHub API rate limit
                githubapi("https://api.github.com/rate_limit", (err, _, body) => {
                    if (err) handleError(err)

                    // Check the quota limit
                    if (body.resources.core.remaining === 0) {
                        // If no API quota remaining
                        console.log(c.yellow(`Maximum quota limit reached on the GitHub api. Automatic updates will not work unless forced until ${dayjs(body.resources.core.reset).$d}`))
                        prepscan()
                    } else {
                        // Check for the latest commit
                        githubapi("https://api.github.com/repos/Richienb/virusshare-hashes/commits/master", (err, _, {
                            commit
                        }) => {
                            if (err) handleError(err)

                            // Get download date of hashlist
                            const saved = dayjs(fs.readFileSync(path.join(args.data, "lastmodified.txt"), "utf8"))

                            // Get latest commit date of hashlist
                            const latest = dayjs(commit.author.date, "YYYY-MM-DDTHH:MM:SSZ")

                            // Check if the saved version is older than the latest
                            if (saved.isBefore(latest)) update()
                            else {
                                console.log(c.green("Hash list is up to date"))
                                prepscan()
                            }
                        })
                    }
                })
            } else update() // If hashlist doesn't exist
        }
    })
} else {
    console.log(c.yellow("Hash list updates disabled"))
    prepscan()
}
