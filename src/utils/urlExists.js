import Promise from "bluebird"
import request from "./request"

export default (url) => new Promise((resolve, reject) => {
    request.head(url)
        .on("response", ({ statusCode }) =>
            resolve(statusCode.toString()[0] === "2")
        )
        .catch((err) => reject(err))
})