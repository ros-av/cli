import octokit from "@octokit/rest"

import userAgent from "./data/userAgent"

export default octokit({
    userAgent,
})