import Promise from "bluebird"

import urlExists from "../utils/urlExists"

export default () => new Promise((resolve, reject) => {
    let totalExists = 0
    let doneFinding = false

    // For each possible URL
    Array.from({ length: 1000 }, async (_, i) => {
        if (doneFinding) return;

        // Get the possible URL
        const url = `https://virusshare.com/hashes/VirusShare_${i.toString().padStart(5, "0")}.md5`

        // If exists increment counter
        urlExists(url).then(exists => {
            if (exists) totalExists++
            // If it doesn't exist break out of loop
            else {
                resolve(totalExists)
                doneFinding = true
            }
        }).catch(() => { })
    })

})